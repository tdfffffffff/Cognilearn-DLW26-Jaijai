/**
 * DrowsinessMonitor — on-device webcam fatigue detection component.
 *
 * Uses MediaPipe FaceMesh to compute EAR (Eye Aspect Ratio) from the webcam.
 * No video is stored or uploaded — only computed scalar metrics are emitted.
 *
 * Props:
 *  - onFatigueUpdate: callback fired every ~5-10 seconds with a FatiguePayload
 *  - debug: optional — whether to draw eye landmarks on a canvas overlay
 *  - config: optional — override default EAR threshold, etc.
 *
 * User must click "Enable Camera" to request permissions (opt-in).
 * "Disable" stops all camera tracks and cleans up.
 */

import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Eye, EyeOff, AlertTriangle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FatigueEngine,
  drawEyeLandmarks,
  type FatiguePayload,
  type FatigueEngineConfig,
} from "@/lib/fatigueEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════════════════════

interface DrowsinessMonitorProps {
  onFatigueUpdate?: (payload: FatiguePayload) => void;
  debug?: boolean;
  config?: Partial<FatigueEngineConfig>;
  /** Compact mode for embedding inline */
  compact?: boolean;
  /** Automatically request camera and start monitor on mount */
  autoStart?: boolean;
  /** Hide controls/metrics UI and run in background */
  hideUI?: boolean;
  /** Callback when camera is enabled or disabled by user action */
  onCameraStateChange?: (enabled: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Status helpers
// ═══════════════════════════════════════════════════════════════════════════════

type FatigueStatus = "ok" | "tired" | "break";

function getStatus(score: number): FatigueStatus {
  if (score >= 0.7) return "break";
  if (score >= 0.4) return "tired";
  return "ok";
}

const statusConfig: Record<
  FatigueStatus,
  { label: string; color: string; bg: string; icon: typeof Eye }
> = {
  ok: {
    label: "OK — Focused",
    color: "text-cognitive-good",
    bg: "bg-cognitive-good/10 border-cognitive-good/30",
    icon: Eye,
  },
  tired: {
    label: "Getting Tired",
    color: "text-cognitive-moderate",
    bg: "bg-cognitive-moderate/10 border-cognitive-moderate/30",
    icon: EyeOff,
  },
  break: {
    label: "Take a Break",
    color: "text-cognitive-critical",
    bg: "bg-cognitive-critical/10 border-cognitive-critical/30",
    icon: AlertTriangle,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

const DrowsinessMonitor: React.FC<DrowsinessMonitorProps> = ({
  onFatigueUpdate,
  debug = false,
  config,
  compact = false,
  autoStart = false,
  hideUI = false,
  onCameraStateChange,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [currentPayload, setCurrentPayload] = useState<FatiguePayload | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FatigueEngine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const lastEmitRef = useRef(0);
  const mountedRef = useRef(true);
  const autoStartAttemptedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    // Stop animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Stop all camera tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Close FaceMesh
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    engineRef.current = null;
  }, []);

  const enableCamera = useCallback(async () => {
    setIsInitializing(true);
    setPermissionDenied(false);

    // Wait for React to render the video element (which now renders when isInitializing=true)
    // Poll for videoRef.current with a timeout
    const waitForVideoElement = async () => {
      const startTime = Date.now();
      while (!videoRef.current && Date.now() - startTime < 2000) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (!videoRef.current) {
        throw new Error('Video element failed to mount after 2 seconds. Check that the component is rendering correctly.');
      }
    };

    try {
      await waitForVideoElement();

      // 1. Request camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      
      // Wait for metadata to load — videoWidth/videoHeight are not available
      // until the 'loadedmetadata' event fires. Without this, MediaPipe gets
      // a 0×0 video element and can't detect faces.
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video metadata load timeout after 5s'));
        }, 5000);
        
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          console.log('[DrowsinessMonitor] Metadata loaded:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
          });
          resolve();
        };
        
        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Video element error'));
        };
      });
      
      // Now play the video
      await video.play();
      console.log('[DrowsinessMonitor] Video playing:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        paused: video.paused,
      });

      // 2. Initialize fatigue engine
      engineRef.current = new FatigueEngine(config);

      // 3. Initialize MediaPipe FaceMesh
      const FaceMeshModule = await import("@mediapipe/face_mesh");
      const FaceMesh = FaceMeshModule.FaceMesh;

      const faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });

      // Wait for model assets to fully download before sending frames.
      // Without this, the first send() calls are silently dropped while
      // the .wasm / .tflite files are still loading from the CDN.
      try {
        await faceMesh.initialize();
      } catch (initErr) {
        console.error("FaceMesh model failed to load:", initErr);
        throw initErr; // bubble up to the outer catch
      }

      faceMesh.onResults((results: any) => {
        if (!mountedRef.current || !engineRef.current) return;

        if (
          results.multiFaceLandmarks &&
          results.multiFaceLandmarks.length > 0
        ) {
          const landmarks = results.multiFaceLandmarks[0];
          const payload = engineRef.current.processFrame(landmarks);

          setFaceDetected(true);
          setCurrentPayload(payload);

          // Emit callback every ~5 seconds
          const now = Date.now();
          if (now - lastEmitRef.current >= 5000) {
            lastEmitRef.current = now;
            onFatigueUpdate?.(payload);
          }

          // Debug overlay
          if (debug && canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
              drawEyeLandmarks(
                ctx,
                landmarks,
                canvasRef.current.width,
                canvasRef.current.height,
                payload.ear,
                engineRef.current
                  ? (config?.EAR_THRESHOLD ?? 0.21)
                  : 0.21,
              );
            }
          }
        } else {
          setFaceDetected(false);
          const noFace = engineRef.current.noFacePayload();
          setCurrentPayload(noFace);

          // Emit callback every ~5 seconds even when no face is detected,
          // so upstream timelines remain continuous across page switches.
          const now = Date.now();
          if (now - lastEmitRef.current >= 5000) {
            lastEmitRef.current = now;
            onFatigueUpdate?.(noFace);
          }
        }
      });

      faceMeshRef.current = faceMesh;

      // Final validation: ensure video is ready before starting the loop
      if (!videoRef.current) {
        throw new Error('Video element not mounted after initialization. This should not happen.');
      }
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        console.error('[DrowsinessMonitor] Video dimensions are 0 after initialization:', {
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight,
          readyState: videoRef.current.readyState,
          srcObject: videoRef.current.srcObject,
        });
        throw new Error('Video failed to load: dimensions are 0×0. Check that the video element is properly rendered in the DOM.');
      }
      console.log('[DrowsinessMonitor] Video ready, starting frame processing:', {
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        readyState: videoRef.current.readyState,
      });

      // 4. Start processing loop
      let frameLogCounter = 0;
      const processFrame = async () => {
        if (
          !mountedRef.current ||
          !videoRef.current ||
          !faceMeshRef.current
        ) return;

        // Log video state every 100 frames (~3 seconds at 30fps)
        if (frameLogCounter % 100 === 0) {
          console.log('[DrowsinessMonitor] Frame processing:', {
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight,
            readyState: videoRef.current.readyState,
            hasEnoughData: videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
          });
        }
        frameLogCounter++;

        if (
          videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          await faceMeshRef.current.send({ image: videoRef.current });
        }

        rafRef.current = requestAnimationFrame(processFrame);
      };

      rafRef.current = requestAnimationFrame(processFrame);
      setIsActive(true);
      onCameraStateChange?.(true);
    } catch (err: any) {
      console.error("Camera/FaceMesh init error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setPermissionDenied(true);
      }
      cleanup();
    } finally {
      if (mountedRef.current) setIsInitializing(false);
    }
  }, [config, debug, onFatigueUpdate, onCameraStateChange, cleanup]);

  const disableCamera = useCallback(() => {
    cleanup();
    setIsActive(false);
    setFaceDetected(false);
    setCurrentPayload(null);
    onCameraStateChange?.(false);
  }, [cleanup, onCameraStateChange]);

  useEffect(() => {
    if (!autoStart || autoStartAttemptedRef.current) return;
    if (isActive || isInitializing) return;
    autoStartAttemptedRef.current = true;
    void enableCamera();
  }, [autoStart, isActive, isInitializing, enableCamera]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

  const status = currentPayload ? getStatus(currentPayload.fatigueScore) : "ok";
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  if (hideUI) {
    return (
      <>
        {(isInitializing || isActive) && (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                position: "fixed",
                left: "-9999px",
                top: "-9999px",
                width: "640px",
                height: "480px",
                pointerEvents: "none",
              }}
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              style={{
                position: "fixed",
                left: "-9999px",
                top: "-9999px",
                width: "640px",
                height: "480px",
                pointerEvents: "none",
              }}
            />
          </>
        )}
      </>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Enable / Disable */}
        {!isActive ? (
          <Button
            onClick={enableCamera}
            disabled={isInitializing}
            variant="outline"
            className="gap-2 w-full"
            size="sm"
          >
            <Camera className="w-4 h-4" />
            {isInitializing ? "Initializing..." : "Enable Camera"}
          </Button>
        ) : (
          <Button
            onClick={disableCamera}
            variant="outline"
            className="gap-2 w-full border-destructive/30 text-destructive hover:bg-destructive/10"
            size="sm"
          >
            <CameraOff className="w-4 h-4" /> Disable Camera
          </Button>
        )}

        {permissionDenied && (
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            Camera permission denied. Please allow camera access in your browser settings.
          </div>
        )}

        {/* Video (hidden in compact) + Status */}
        {(isInitializing || isActive) && (
          <div className="space-y-2">
            {/* Position off-screen instead of display:none or shrinking to 1px.
                display:none or tiny dimensions cause browsers to suppress frame
                rendering/decoding, which makes MediaPipe unable to capture frames.
                Positioning off-screen keeps the video rendering pipeline active. */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{ 
                position: "fixed", 
                left: "-9999px", 
                top: "-9999px",
                width: "640px",
                height: "480px",
                pointerEvents: "none" 
              }}
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }}
            />

            <div className={`flex items-center gap-2 p-2 rounded-lg border ${cfg.bg}`}>
              <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
              <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>

            {!faceDetected && (
              <div className="p-2 rounded-lg bg-cognitive-moderate/10 border border-cognitive-moderate/30 text-xs text-cognitive-moderate">
                No face detected — make sure you're visible to the camera.
              </div>
            )}

            {currentPayload && faceDetected && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-secondary/30">
                  <span className="text-muted-foreground">EAR:</span>{" "}
                  <span className="font-mono text-foreground">{currentPayload.ear.toFixed(3)}</span>
                </div>
                <div className="p-2 rounded bg-secondary/30">
                  <span className="text-muted-foreground">Fatigue:</span>{" "}
                  <span className="font-mono text-foreground">{(currentPayload.fatigueScore * 100).toFixed(0)}%</span>
                </div>
                <div className="p-2 rounded bg-secondary/30">
                  <span className="text-muted-foreground">PERCLOS:</span>{" "}
                  <span className="font-mono text-foreground">{(currentPayload.perclos60s * 100).toFixed(0)}%</span>
                </div>
                <div className="p-2 rounded bg-secondary/30">
                  <span className="text-muted-foreground">Blinks/min:</span>{" "}
                  <span className="font-mono text-foreground">{currentPayload.blinkPerMin.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Full layout ──

  return (
    <div className="space-y-4">
      {/* Camera Controls */}
      <div className="flex items-center gap-3">
        {!isActive ? (
          <Button
            onClick={enableCamera}
            disabled={isInitializing}
            className="gap-2"
          >
            <Camera className="w-4 h-4" />
            {isInitializing ? "Initializing camera..." : "Enable Camera"}
          </Button>
        ) : (
          <Button
            onClick={disableCamera}
            variant="outline"
            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <CameraOff className="w-4 h-4" /> Disable Camera
          </Button>
        )}

        {isActive && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-cognitive-good animate-pulse" />
              <span className="text-xs text-cognitive-good font-mono">LIVE</span>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {permissionDenied && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/30"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive">
              Camera permission denied. Please allow camera access in your browser settings and try again.
            </p>
          </div>
        </motion.div>
      )}

      {/* Video + Canvas Overlay */}
      {(isInitializing || isActive) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-xl overflow-hidden border border-border bg-black"
        >
          <video
            ref={videoRef}
            className="w-full max-h-[300px] object-cover"
            playsInline
            muted
            autoPlay
            style={{ transform: "scaleX(-1)" }}
          />
          {debug && (
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: "scaleX(-1)" }}
            />
          )}

          {/* Status Overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge
              variant="outline"
              className={`${cfg.bg} ${cfg.color} text-[10px] backdrop-blur-md`}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {cfg.label}
            </Badge>
          </div>

          {/* No face warning */}
          {!faceDetected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <EyeOff className="w-8 h-8 text-cognitive-moderate mx-auto mb-2" />
                <p className="text-sm text-cognitive-moderate">No face detected</p>
                <p className="text-xs text-muted-foreground">
                  Make sure you&apos;re visible to the camera
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Metrics Cards */}
      {isActive && currentPayload && faceDetected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <div className="glass rounded-lg p-3">
            <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
              Smoothed EAR
            </p>
            <p className="text-lg font-bold font-mono text-primary">
              {currentPayload.ear.toFixed(3)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Threshold: {config?.EAR_THRESHOLD ?? 0.21}
            </p>
          </div>

          <div className="glass rounded-lg p-3">
            <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
              Fatigue Score
            </p>
            <p
              className={`text-lg font-bold ${
                currentPayload.fatigueScore > 0.7
                  ? "text-cognitive-critical"
                  : currentPayload.fatigueScore > 0.4
                    ? "text-cognitive-moderate"
                    : "text-cognitive-good"
              }`}
            >
              {(currentPayload.fatigueScore * 100).toFixed(0)}%
            </p>
            <div className="mt-1 h-1.5 rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full ${
                  currentPayload.fatigueScore > 0.7
                    ? "bg-cognitive-critical"
                    : currentPayload.fatigueScore > 0.4
                      ? "bg-cognitive-moderate"
                      : "bg-cognitive-good"
                }`}
                animate={{
                  width: `${currentPayload.fatigueScore * 100}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="glass rounded-lg p-3">
            <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
              PERCLOS (60s)
            </p>
            <p className="text-lg font-bold font-mono text-foreground">
              {(currentPayload.perclos60s * 100).toFixed(0)}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              Eyes closed fraction
            </p>
          </div>

          <div className="glass rounded-lg p-3">
            <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
              Blinks / min
            </p>
            <p className="text-lg font-bold font-mono text-foreground">
              {currentPayload.blinkPerMin.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Normal: 15–20
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DrowsinessMonitor;
