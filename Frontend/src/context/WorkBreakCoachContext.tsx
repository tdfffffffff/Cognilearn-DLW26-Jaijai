/**
 * WorkBreakCoachProvider — React context that wires DrowsinessMonitor
 * updates into the WorkBreakCoach engine and exposes coaching state
 * to the whole app.
 *
 * Usage:
 *   <WorkBreakCoachProvider>
 *     <App />
 *   </WorkBreakCoachProvider>
 *
 * Then in any component:
 *   const coach = useWorkBreakCoach();
 *   coach.currentState  // FOCUS | WARN | BREAK_SUGGESTED | BREAK_ACTIVE | CRITICAL
 *   coach.startBreak()
 *   coach.dismiss()
 *   coach.snooze()
 */

import React, {
  createContext,
  useContext,
  useRef,
  useSyncExternalStore,
  useCallback,
  type ReactNode,
} from "react";
import {
  WorkBreakCoach,
  type CoachSnapshot,
  type WorkBreakProfile,
} from "@/lib/workBreakCoach";
import type { FatiguePayload } from "@/lib/fatigueEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// Context shape
// ═══════════════════════════════════════════════════════════════════════════════

interface WorkBreakCoachContextValue {
  /** Current coaching snapshot */
  snapshot: CoachSnapshot;
  /** Feed a fatigue update from DrowsinessMonitor */
  handleFatigueUpdate: (payload: FatiguePayload) => void;
  /** User starts a break */
  startBreak: () => void;
  /** User snoozes the alert (cooldown) */
  snooze: () => void;
  /** User dismisses the alert (cooldown + adapt thresholds) */
  dismiss: () => void;
  /** User ends break early */
  endBreak: () => void;
  /** Update profile settings */
  updateProfile: (partial: Partial<WorkBreakProfile>) => void;
  /** Reset profile to defaults */
  resetProfile: () => void;
}

const defaultSnapshot: CoachSnapshot = {
  state: "FOCUS",
  suggestedBreakMin: 5,
  showAlert: false,
  alertMessage: "",
  focusElapsedMin: 0,
  breakRemainingMin: 0,
  profile: {
    preferredFocusMin: 25,
    preferredBreakMin: 5,
    warnThreshold: 0.55,
    breakThreshold: 0.70,
    criticalThreshold: 0.85,
    cooldownMin: 10,
    fatigueSlopeEstimate: 0,
    dismissCountToday: 0,
    lastDismissDate: "",
  },
  latestFatigue: 0,
};

const WorkBreakCoachContext = createContext<WorkBreakCoachContextValue>({
  snapshot: defaultSnapshot,
  handleFatigueUpdate: () => {},
  startBreak: () => {},
  snooze: () => {},
  dismiss: () => {},
  endBreak: () => {},
  updateProfile: () => {},
  resetProfile: () => {},
});

// ═══════════════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════════════

export function WorkBreakCoachProvider({ children }: { children: ReactNode }) {
  const coachRef = useRef<WorkBreakCoach>(new WorkBreakCoach());
  const coach = coachRef.current;

  // useSyncExternalStore for reactive updates
  const snapshot = useSyncExternalStore(
    useCallback((cb: () => void) => coach.subscribe(cb), [coach]),
    useCallback(() => coach.getSnapshot(), [coach]),
    useCallback(() => coach.getSnapshot(), [coach]),
  );

  const handleFatigueUpdate = useCallback(
    (payload: FatiguePayload) => coach.update(payload),
    [coach],
  );

  const startBreak = useCallback(() => coach.startBreak(), [coach]);
  const snooze = useCallback(() => coach.snooze(), [coach]);
  const dismiss = useCallback(() => coach.dismiss(), [coach]);
  const endBreak = useCallback(() => coach.endBreak(), [coach]);

  const updateProfile = useCallback(
    (partial: Partial<WorkBreakProfile>) => coach.updateProfile(partial),
    [coach],
  );
  const resetProfile = useCallback(() => coach.resetProfile(), [coach]);

  return (
    <WorkBreakCoachContext.Provider
      value={{
        snapshot,
        handleFatigueUpdate,
        startBreak,
        snooze,
        dismiss,
        endBreak,
        updateProfile,
        resetProfile,
      }}
    >
      {children}
    </WorkBreakCoachContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════════

export function useWorkBreakCoach(): WorkBreakCoachContextValue {
  return useContext(WorkBreakCoachContext);
}
