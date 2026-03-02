/**
 * EAR-based Fatigue Engine — runs on-device in the browser.
 *
 * Computes Eye Aspect Ratio (EAR) from MediaPipe FaceMesh landmarks,
 * detects blinks, tracks PERCLOS (% eyes closed over 60s), and produces
 * a composite fatigue score in [0, 1].
 *
 * No video is stored or transmitted. Only computed scalar metrics are emitted.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface FatiguePayload {
  fatigueScore: number;   // [0, 1]
  ear: number;            // smoothed EAR
  perclos60s: number;     // fraction of frames in last 60s where EAR < threshold
  blinkPerMin: number;    // rolling blinks per minute
  faceDetected: boolean;
  ts: number;             // Date.now()
}

export interface FatigueEngineConfig {
  EAR_THRESHOLD: number;           // default 0.21
  CLOSED_FRAMES_TRIGGER: number;   // ≈0.5s at 30fps → 15 frames
  PERCLOS_WINDOW_SEC: number;      // default 60
  EMA_ALPHA: number;               // EMA smoothing factor, default 0.2
}

// ═══════════════════════════════════════════════════════════════════════════════
// Landmark Indices (MediaPipe 468-point FaceMesh)
// ═══════════════════════════════════════════════════════════════════════════════

// Left eye: [33, 160, 158, 133, 153, 144]
// p1=33 (outer corner), p2=160 (upper-outer), p3=158 (upper-inner),
// p4=133 (inner corner), p5=153 (lower-inner), p6=144 (lower-outer)
const LEFT_EYE = [33, 160, 158, 133, 153, 144] as const;

// Right eye: [362, 385, 387, 263, 373, 380]
const RIGHT_EYE = [362, 385, 387, 263, 373, 380] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Euclidean distance helper
// ═══════════════════════════════════════════════════════════════════════════════

interface Point3D {
  x: number;
  y: number;
  z: number;
}

function dist(a: Point3D, b: Point3D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/**
 * EAR = (dist(p2,p6) + dist(p3,p5)) / (2 * dist(p1,p4))
 */
function computeEAR(landmarks: Point3D[], indices: readonly number[]): number {
  const [p1, p2, p3, p4, p5, p6] = indices.map((i) => landmarks[i]);
  const vertical1 = dist(p2, p6);
  const vertical2 = dist(p3, p5);
  const horizontal = dist(p1, p4);
  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2 * horizontal);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fatigue Engine Class
// ═══════════════════════════════════════════════════════════════════════════════

export class FatigueEngine {
  private config: FatigueEngineConfig;

  // Smoothed EAR (EMA)
  private smoothedEAR = 0.3;
  private firstFrame = true;

  // Blink detection
  private eyesClosed = false;
  private closedFrameCount = 0;
  private blinkTimestamps: number[] = []; // timestamps of detected blinks

  // PERCLOS: circular buffer of (timestamp, wasClosed) pairs
  private perclosBuffer: { ts: number; closed: boolean }[] = [];

  // Long-closure ("microsleep") events for fatigue scoring
  private longClosureCount = 0;
  private longClosureWindow: number[] = []; // timestamps of long-closure events

  // Frame counter
  private frameCount = 0;
  private startTime = Date.now();

  constructor(config?: Partial<FatigueEngineConfig>) {
    this.config = {
      EAR_THRESHOLD: 0.21,
      CLOSED_FRAMES_TRIGGER: 15,
      PERCLOS_WINDOW_SEC: 60,
      EMA_ALPHA: 0.2,
      ...config,
    };
  }

  /**
   * Process a single frame's landmarks. Call this on every FaceMesh result.
   * Returns the latest FatiguePayload.
   */
  processFrame(landmarks: Point3D[]): FatiguePayload {
    const now = Date.now();
    this.frameCount++;

    // 1. Compute raw EAR for both eyes
    const leftEAR = computeEAR(landmarks, LEFT_EYE);
    const rightEAR = computeEAR(landmarks, RIGHT_EYE);
    const rawEAR = (leftEAR + rightEAR) / 2;

    // 2. EMA smoothing
    if (this.firstFrame) {
      this.smoothedEAR = rawEAR;
      this.firstFrame = false;
    } else {
      this.smoothedEAR =
        this.config.EMA_ALPHA * rawEAR +
        (1 - this.config.EMA_ALPHA) * this.smoothedEAR;
    }

    // 3. Determine if eyes are closed this frame
    const isClosed = this.smoothedEAR < this.config.EAR_THRESHOLD;

    // 4. Push to PERCLOS buffer and prune old entries
    this.perclosBuffer.push({ ts: now, closed: isClosed });
    const perclosWindowMs = this.config.PERCLOS_WINDOW_SEC * 1000;
    while (
      this.perclosBuffer.length > 0 &&
      this.perclosBuffer[0].ts < now - perclosWindowMs
    ) {
      this.perclosBuffer.shift();
    }

    // 5. Blink detection — closed→open transition
    if (isClosed) {
      this.closedFrameCount++;
    } else {
      if (this.eyesClosed && this.closedFrameCount > 0) {
        // Eyes just opened — was it a blink or long closure?
        if (this.closedFrameCount < this.config.CLOSED_FRAMES_TRIGGER) {
          // Normal blink
          this.blinkTimestamps.push(now);
        } else {
          // Long closure / microsleep event
          this.longClosureWindow.push(now);
        }
      }
      this.closedFrameCount = 0;
    }
    this.eyesClosed = isClosed;

    // If eyes have been closed for too long continuously, count it as ongoing long-closure
    if (this.closedFrameCount === this.config.CLOSED_FRAMES_TRIGGER) {
      this.longClosureWindow.push(now);
    }

    // 6. Prune old blink timestamps (keep last 2 minutes)
    const twoMinAgo = now - 120_000;
    this.blinkTimestamps = this.blinkTimestamps.filter((t) => t > twoMinAgo);
    this.longClosureWindow = this.longClosureWindow.filter(
      (t) => t > now - perclosWindowMs
    );

    // 7. Compute metrics
    const perclos60s = this.computePerclos();
    const blinkPerMin = this.computeBlinkRate(now);
    const fatigueScore = this.computeFatigueScore(perclos60s, now);

    return {
      fatigueScore,
      ear: this.smoothedEAR,
      perclos60s,
      blinkPerMin,
      faceDetected: true,
      ts: now,
    };
  }

  /** Returns a "no face detected" payload */
  noFacePayload(): FatiguePayload {
    return {
      fatigueScore: 0,
      ear: 0,
      perclos60s: 0,
      blinkPerMin: 0,
      faceDetected: false,
      ts: Date.now(),
    };
  }

  /** PERCLOS = fraction of frames in the window where EAR < threshold */
  private computePerclos(): number {
    if (this.perclosBuffer.length === 0) return 0;
    const closedCount = this.perclosBuffer.filter((f) => f.closed).length;
    return closedCount / this.perclosBuffer.length;
  }

  /** Rolling blinks per minute */
  private computeBlinkRate(now: number): number {
    const oneMinAgo = now - 60_000;
    const recentBlinks = this.blinkTimestamps.filter((t) => t > oneMinAgo);
    // Scale up if we have less than 60s of data
    const elapsedSec = Math.min(60, (now - this.startTime) / 1000);
    if (elapsedSec < 5) return 0; // not enough data yet
    const windowSec = Math.min(60, elapsedSec);
    return (recentBlinks.length / windowSec) * 60;
  }

  /**
   * Composite fatigue score in [0, 1].
   *
   * Components:
   * - PERCLOS weight: 0.5 (most reliable indicator)
   * - Long-closure frequency weight: 0.3
   * - Low blink rate or very high blink rate: 0.2
   */
  private computeFatigueScore(perclos: number, now: number): number {
    // Component 1: PERCLOS → scale from 0–0.5 perclos to 0–1
    const perclosComponent = Math.min(1, perclos / 0.5);

    // Component 2: Long closure frequency
    const longClosures = this.longClosureWindow.length;
    const longClosureComponent = Math.min(1, longClosures / 5); // 5+ events = max

    // Component 3: Blink rate anomaly
    // Normal blink rate: 15-20/min
    // Fatigue indicators: very low (<8) or very high (>25)
    const blinkRate = this.computeBlinkRate(now);
    let blinkComponent = 0;
    if (blinkRate > 0) {
      if (blinkRate < 8) blinkComponent = (8 - blinkRate) / 8;
      else if (blinkRate > 25) blinkComponent = Math.min(1, (blinkRate - 25) / 15);
    }

    const score =
      0.5 * perclosComponent +
      0.3 * longClosureComponent +
      0.2 * blinkComponent;

    return Math.max(0, Math.min(1, score));
  }

  /** Reset all state */
  reset(): void {
    this.smoothedEAR = 0.3;
    this.firstFrame = true;
    this.eyesClosed = false;
    this.closedFrameCount = 0;
    this.blinkTimestamps = [];
    this.perclosBuffer = [];
    this.longClosureWindow = [];
    this.longClosureCount = 0;
    this.frameCount = 0;
    this.startTime = Date.now();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Debug overlay: draw eye landmarks on a canvas
// ═══════════════════════════════════════════════════════════════════════════════

export function drawEyeLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Point3D[],
  width: number,
  height: number,
  ear: number,
  threshold: number,
): void {
  ctx.clearRect(0, 0, width, height);

  const color = ear < threshold ? "#ef4444" : "#22d3ee";

  // Draw left eye
  drawEyeOutline(ctx, landmarks, LEFT_EYE, width, height, color);
  // Draw right eye
  drawEyeOutline(ctx, landmarks, RIGHT_EYE, width, height, color);

  // Draw EAR text
  ctx.font = "14px monospace";
  ctx.fillStyle = color;
  ctx.fillText(`EAR: ${ear.toFixed(3)}`, 10, 20);
  ctx.fillText(`Threshold: ${threshold}`, 10, 38);
}

function drawEyeOutline(
  ctx: CanvasRenderingContext2D,
  landmarks: Point3D[],
  indices: readonly number[],
  w: number,
  h: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < indices.length; i++) {
    const lm = landmarks[indices[i]];
    const x = lm.x * w;
    const y = lm.y * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Draw points
  ctx.fillStyle = color;
  for (const idx of indices) {
    const lm = landmarks[idx];
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}
