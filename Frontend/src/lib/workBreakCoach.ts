/**
 * WorkBreakCoach — personalized work–break cycle manager.
 *
 * Consumes periodic FatiguePayload updates from DrowsinessMonitor
 * and produces adaptive coaching decisions:
 *   - coachState ∈ { FOCUS, WARN, BREAK_SUGGESTED, BREAK_ACTIVE, CRITICAL }
 *   - suggestedBreakMin (dynamic)
 *   - alert messages with cooldown to avoid spamming
 *
 * Personalization parameters are persisted in localStorage under
 * `workbreak_profile_v1` and adapt based on user actions + observed recovery.
 */

import type { FatiguePayload } from "@/lib/fatigueEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type CoachState =
  | "FOCUS"
  | "WARN"
  | "BREAK_SUGGESTED"
  | "BREAK_ACTIVE"
  | "CRITICAL";

export interface WorkBreakProfile {
  preferredFocusMin: number;       // default 25
  preferredBreakMin: number;       // default 5
  warnThreshold: number;           // default 0.55
  breakThreshold: number;          // default 0.70
  criticalThreshold: number;       // default 0.85
  cooldownMin: number;             // default 10
  fatigueSlopeEstimate: number;    // optional, estimated rise rate
  dismissCountToday: number;       // optional, count of dismissals
  lastDismissDate: string;         // ISO date string for reset
}

export interface CoachSnapshot {
  state: CoachState;
  suggestedBreakMin: number;
  showAlert: boolean;
  alertMessage: string;
  focusElapsedMin: number;
  breakRemainingMin: number;
  profile: WorkBreakProfile;
  latestFatigue: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Defaults & LocalStorage
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "workbreak_profile_v1";

const DEFAULT_PROFILE: WorkBreakProfile = {
  preferredFocusMin: 25,
  preferredBreakMin: 5,
  warnThreshold: 0.55,
  breakThreshold: 0.70,
  criticalThreshold: 0.85,
  cooldownMin: 10,
  fatigueSlopeEstimate: 0,
  dismissCountToday: 0,
  lastDismissDate: new Date().toISOString().slice(0, 10),
};

function loadProfile(): WorkBreakProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Reset daily counter if date changed
      const today = new Date().toISOString().slice(0, 10);
      if (parsed.lastDismissDate !== today) {
        parsed.dismissCountToday = 0;
        parsed.lastDismissDate = today;
      }
      return { ...DEFAULT_PROFILE, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PROFILE };
}

function saveProfile(profile: WorkBreakProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore quota errors
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Coach Class
// ═══════════════════════════════════════════════════════════════════════════════

export class WorkBreakCoach {
  private profile: WorkBreakProfile;
  private state: CoachState = "FOCUS";

  // Timing
  private focusStartTime = Date.now();
  private breakStartTime = 0;
  private breakDurationMs = 0;

  // Fatigue tracking for sustained-threshold detection
  private warnStartTime = 0;       // when fatigue first exceeded warnThreshold
  private breakSuggestTime = 0;    // when fatigue first exceeded breakThreshold
  private criticalStartTime = 0;   // when fatigue first exceeded criticalThreshold

  // Alert cooldown
  private lastAlertTime = 0;
  private inCooldown = false;
  private cooldownEndTime = 0;

  // Alert state
  private _showAlert = false;
  private _alertMessage = "";

  // Fatigue history for slope estimation
  private fatigueHistory: { ts: number; score: number }[] = [];

  // Recovery tracking (fatigue at break start)
  private fatigueAtBreakStart = 0;

  // Latest fatigue score
  private latestFatigue = 0;

  // Cached snapshot for useSyncExternalStore (must be referentially stable)
  private _cachedSnapshot: CoachSnapshot | null = null;

  // Listeners
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.profile = loadProfile();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════════════════

  /** Subscribe to state changes */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this._cachedSnapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  /** Get current snapshot (cached — safe for useSyncExternalStore) */
  getSnapshot(): CoachSnapshot {
    if (!this._cachedSnapshot) {
      this._cachedSnapshot = this.buildSnapshot();
    }
    return this._cachedSnapshot;
  }

  /** Build a fresh snapshot object */
  private buildSnapshot(): CoachSnapshot {
    const now = Date.now();
    const focusElapsedMin =
      this.state !== "BREAK_ACTIVE"
        ? (now - this.focusStartTime) / 60_000
        : 0;

    let breakRemainingMin = 0;
    if (this.state === "BREAK_ACTIVE") {
      const elapsed = now - this.breakStartTime;
      breakRemainingMin = Math.max(
        0,
        (this.breakDurationMs - elapsed) / 60_000,
      );
    }

    return {
      state: this.state,
      suggestedBreakMin: this.computeSuggestedBreak(),
      showAlert: this._showAlert,
      alertMessage: this._alertMessage,
      focusElapsedMin,
      breakRemainingMin,
      profile: { ...this.profile },
      latestFatigue: this.latestFatigue,
    };
  }

  /**
   * Feed a fatigue payload from DrowsinessMonitor.
   * This is the main loop driver — call every 5-10 seconds.
   */
  update(payload: FatiguePayload): void {
    if (!payload.faceDetected) return; // skip if no face

    this.latestFatigue = payload.fatigueScore;
    const now = payload.ts;

    // Track fatigue history for slope estimation (keep last 10 min)
    this.fatigueHistory.push({ ts: now, score: payload.fatigueScore });
    const tenMinAgo = now - 600_000;
    this.fatigueHistory = this.fatigueHistory.filter((f) => f.ts > tenMinAgo);

    // Estimate slope
    this.estimateSlope();

    // Check break timer
    if (this.state === "BREAK_ACTIVE") {
      this.checkBreakEnd(now, payload.fatigueScore);
      this.notify();
      return;
    }

    // Check cooldown
    if (this.inCooldown && now < this.cooldownEndTime) {
      // Still in cooldown — don't show alerts but keep tracking
      this._showAlert = false;
      this.notify();
      return;
    }
    if (this.inCooldown && now >= this.cooldownEndTime) {
      this.inCooldown = false;
    }

    // Focus session duration check
    const focusElapsedMin = (now - this.focusStartTime) / 60_000;
    if (focusElapsedMin >= this.profile.preferredFocusMin) {
      // Time for a break regardless of fatigue
      this.transitionTo("BREAK_SUGGESTED", now);
      this._alertMessage = `You've been studying for ${Math.round(focusElapsedMin)} minutes. Time for a ${this.computeSuggestedBreak()}-minute break!`;
      this._showAlert = true;
      this.notify();
      return;
    }

    // Sustained threshold detection
    const score = payload.fatigueScore;

    // CRITICAL check (≥20s sustained above criticalThreshold)
    if (score > this.profile.criticalThreshold) {
      if (this.criticalStartTime === 0) this.criticalStartTime = now;
      if (now - this.criticalStartTime >= 20_000) {
        this.transitionTo("CRITICAL", now);
        this._alertMessage =
          "⚠️ High fatigue detected! Please take a break immediately to protect your learning quality.";
        this._showAlert = true;
        this.notify();
        return;
      }
    } else {
      this.criticalStartTime = 0;
    }

    // BREAK_SUGGESTED check (≥45s sustained above breakThreshold)
    if (score > this.profile.breakThreshold) {
      if (this.breakSuggestTime === 0) this.breakSuggestTime = now;
      if (now - this.breakSuggestTime >= 45_000) {
        this.transitionTo("BREAK_SUGGESTED", now);
        this._alertMessage = `You're showing signs of fatigue. Take a ${this.computeSuggestedBreak()}-min break?`;
        this._showAlert = true;
        this.notify();
        return;
      }
    } else {
      this.breakSuggestTime = 0;
    }

    // WARN check (≥30s sustained above warnThreshold)
    if (score > this.profile.warnThreshold) {
      if (this.warnStartTime === 0) this.warnStartTime = now;
      if (now - this.warnStartTime >= 30_000 && this.state === "FOCUS") {
        this.transitionTo("WARN", now);
        this._alertMessage =
          "Attention dipping — try to re-focus or consider a quick stretch.";
        this._showAlert = true;
        this.notify();
        return;
      }
    } else {
      this.warnStartTime = 0;
      // If fatigue dropped, go back to FOCUS
      if (this.state === "WARN") {
        this.transitionTo("FOCUS", now);
        this._showAlert = false;
      }
    }

    // Adaptive focus duration adjustment
    this.adaptFocusDuration(score);

    this.notify();
  }

  /** User clicks "Start Break" */
  startBreak(): void {
    const now = Date.now();
    this.fatigueAtBreakStart = this.latestFatigue;
    this.breakDurationMs = this.computeSuggestedBreak() * 60_000;
    this.breakStartTime = now;
    this.transitionTo("BREAK_ACTIVE", now);
    this._showAlert = false;
    this.notify();
  }

  /** User clicks "Snooze" — set cooldown */
  snooze(): void {
    const now = Date.now();
    this.inCooldown = true;
    this.cooldownEndTime = now + this.profile.cooldownMin * 60_000;
    this._showAlert = false;
    this.transitionTo("FOCUS", now);
    this.notify();
  }

  /** User clicks "Dismiss" — increase thresholds + set cooldown */
  dismiss(): void {
    const now = Date.now();

    // Check if dismissed within 5 seconds (quick dismiss → reduce sensitivity)
    if (this.lastAlertTime > 0 && now - this.lastAlertTime < 5000) {
      this.profile.warnThreshold = Math.min(
        0.90,
        this.profile.warnThreshold + 0.02,
      );
      this.profile.breakThreshold = Math.min(
        0.90,
        this.profile.breakThreshold + 0.02,
      );
    }

    this.profile.dismissCountToday++;
    saveProfile(this.profile);

    this.inCooldown = true;
    this.cooldownEndTime = now + this.profile.cooldownMin * 60_000;
    this._showAlert = false;
    this.transitionTo("FOCUS", now);
    this.notify();
  }

  /** End a break early or on timer completion */
  endBreak(): void {
    const now = Date.now();

    // Check recovery: if fatigue dropped significantly during break
    if (
      this.fatigueAtBreakStart > 0 &&
      this.latestFatigue < this.fatigueAtBreakStart * 0.6
    ) {
      // Good recovery → slightly increase sensitivity
      this.profile.warnThreshold = Math.max(
        0.40,
        this.profile.warnThreshold - 0.01,
      );
      saveProfile(this.profile);
    }

    this.focusStartTime = now;
    this.warnStartTime = 0;
    this.breakSuggestTime = 0;
    this.criticalStartTime = 0;
    this.transitionTo("FOCUS", now);
    this._showAlert = false;
    this.notify();
  }

  /** Get current profile */
  getProfile(): WorkBreakProfile {
    return { ...this.profile };
  }

  /** Update profile */
  updateProfile(partial: Partial<WorkBreakProfile>): void {
    this.profile = { ...this.profile, ...partial };
    saveProfile(this.profile);
    this.notify();
  }

  /** Reset to defaults */
  resetProfile(): void {
    this.profile = { ...DEFAULT_PROFILE };
    saveProfile(this.profile);
    this.notify();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private transitionTo(newState: CoachState, now: number): void {
    this.state = newState;
    if (
      newState === "WARN" ||
      newState === "BREAK_SUGGESTED" ||
      newState === "CRITICAL"
    ) {
      this.lastAlertTime = now;
    }
  }

  private computeSuggestedBreak(): number {
    let base = this.profile.preferredBreakMin;
    if (this.latestFatigue > this.profile.criticalThreshold) {
      base = Math.min(20, base + 5);
    } else if (this.latestFatigue > this.profile.breakThreshold) {
      base = Math.min(20, base + 2);
    }
    return base;
  }

  private checkBreakEnd(now: number, fatigue: number): void {
    const elapsed = now - this.breakStartTime;
    if (elapsed >= this.breakDurationMs) {
      this.endBreak();
    }
  }

  private estimateSlope(): void {
    if (this.fatigueHistory.length < 3) return;
    const recent = this.fatigueHistory.slice(-6);
    if (recent.length < 2) return;

    const first = recent[0];
    const last = recent[recent.length - 1];
    const dtMin = (last.ts - first.ts) / 60_000;
    if (dtMin < 0.5) return;

    this.profile.fatigueSlopeEstimate =
      (last.score - first.score) / dtMin;
  }

  private adaptFocusDuration(currentFatigue: number): void {
    const slope = this.profile.fatigueSlopeEstimate;

    // If fatigue rises quickly (slope > 0.05/min), reduce focus duration
    if (slope > 0.05) {
      const newFocus = Math.max(15, this.profile.preferredFocusMin - 5);
      if (newFocus !== this.profile.preferredFocusMin) {
        this.profile.preferredFocusMin = newFocus;
        saveProfile(this.profile);
      }
    }

    // If fatigue stays low for a long session, increase focus duration
    const focusElapsedMin =
      (Date.now() - this.focusStartTime) / 60_000;
    if (
      focusElapsedMin > this.profile.preferredFocusMin * 0.8 &&
      currentFatigue < this.profile.warnThreshold * 0.7
    ) {
      const newFocus = Math.min(60, this.profile.preferredFocusMin + 5);
      if (newFocus !== this.profile.preferredFocusMin) {
        this.profile.preferredFocusMin = newFocus;
        saveProfile(this.profile);
      }
    }
  }
}
