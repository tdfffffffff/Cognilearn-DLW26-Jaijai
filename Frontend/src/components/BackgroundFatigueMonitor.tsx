/**
 * BackgroundFatigueMonitor — persistent, app-level camera + FaceMesh + FatigueEngine.
 *
 * This component is always mounted at the App level (inside FatigueStreamProvider).
 * It owns the camera stream, MediaPipe FaceMesh inference, and FatigueEngine lifecycle.
 *
 * Because it never unmounts during page navigation, the camera stream, accumulated
 * PERCLOS buffer, blink history, and fatigue score persist across the entire session.
 *
 * The active MediaStream is shared via FatigueStreamContext so the AttentionMonitor
 * page (or any page) can display a live video preview without owning the camera.
 *
 * No video is stored or uploaded — all processing is on-device.
 */

import { useEffect, useRef } from "react";
import { FatigueEngine } from "@/lib/fatigueEngine";
import { useFatigueStream } from "@/context/FatigueStreamContext";

/** How often to push a FatiguePayload to context (ms) */
const EMIT_INTERVAL_MS = 2000;

export default function BackgroundFatigueMonitor() {
  const {
    cameraEnabled,
    handleMonitorUpdate,
    setMediaStream,
    setFaceDetected,
    setIsMonitorInitializing,
    setPermissionDenied,
    setCameraEnabled,
  } = useFatigueStream();

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // ── Camera disabled → ensure clean state ──
    if (!cameraEnabled) {
      setMediaStream(null);
      setFaceDetected(false);
      setIsMonitorInitializing(false);
      return;
    }

    // ── Camera enabled → start ──
    let cancelled = false;
    let stream: MediaStream | null = null;
    let faceMesh: any = null;
    let engine: FatigueEngine | null = null;
    let raf: number | null = null;
    let lastEmit = 0;

    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      if (faceMesh) {
        try {
          faceMesh.close();
        } catch {
          /* ignore */
        }
        faceMesh = null;
      }
      engine = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setMediaStream(null);
      setFaceDetected(false);
    };

    (async () => {
      setIsMonitorInitializing(true);
      setPermissionDenied(false);

      try {
        // 1. Request camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setMediaStream(stream);

        // 2. Attach to hidden video element
        const video = videoRef.current;
        if (!video) throw new Error("Video element not available");
        video.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Video metadata timeout")),
            5000,
          );
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };
          video.onerror = () => {
            clearTimeout(timeout);
            reject(new Error("Video error"));
          };
        });
        if (cancelled) return;

        await video.play();
        if (cancelled) return;

        // 3. Initialize FatigueEngine
        engine = new FatigueEngine();

        // 4. Initialize MediaPipe FaceMesh (dynamic import)
        const FaceMeshModule = await import("@mediapipe/face_mesh");
        if (cancelled) return;

        const FaceMesh = FaceMeshModule.FaceMesh;
        faceMesh = new FaceMesh({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });

        await faceMesh.initialize();
        if (cancelled) return;

        faceMesh.onResults((results: any) => {
          if (cancelled || !engine) return;

          if (results.multiFaceLandmarks?.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            const payload = engine.processFrame(landmarks);
            setFaceDetected(true);

            const now = Date.now();
            if (now - lastEmit >= EMIT_INTERVAL_MS) {
              lastEmit = now;
              handleMonitorUpdate(payload);
            }
          } else {
            setFaceDetected(false);
            const noFace = engine.noFacePayload();

            const now = Date.now();
            if (now - lastEmit >= EMIT_INTERVAL_MS) {
              lastEmit = now;
              handleMonitorUpdate(noFace);
            }
          }
        });

        // 5. Start frame processing loop
        const tick = async () => {
          if (cancelled || !videoRef.current || !faceMesh) return;
          if (
            videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
          ) {
            await faceMesh.send({ image: videoRef.current });
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (err: any) {
        console.error("[BackgroundFatigueMonitor] Init error:", err);
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setPermissionDenied(true);
        }
        cleanup();
        setCameraEnabled(false);
      } finally {
        if (!cancelled) setIsMonitorInitializing(false);
      }
    })();

    // Effect cleanup — runs when cameraEnabled toggles or component unmounts
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraEnabled]);

  // Hidden video element — always in the DOM so the ref is immediately available.
  // Positioned off-screen (not display:none) so the browser keeps the video
  // rendering pipeline active for MediaPipe frame capture.
  return (
    <video
      ref={videoRef}
      playsInline
      muted
      style={{
        position: "fixed",
        left: "-9999px",
        top: "-9999px",
        width: "640px",
        height: "480px",
        pointerEvents: "none",
      }}
    />
  );
}
