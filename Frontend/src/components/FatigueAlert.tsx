/**
 * FatigueAlert — overlay alert/modal for fatigue coaching events.
 *
 * Shows when WorkBreakCoach triggers an alert (WARN, BREAK_SUGGESTED, CRITICAL).
 * Provides buttons: Start Break, Snooze 10 min, Dismiss.
 * During BREAK_ACTIVE, shows a countdown timer with "Ready to focus?" button.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Coffee,
  Clock,
  X,
  BellOff,
  Play,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkBreakCoach } from "@/context/WorkBreakCoachContext";

const FatigueAlert: React.FC = () => {
  const { snapshot, startBreak, snooze, dismiss, endBreak } =
    useWorkBreakCoach();

  const [breakCountdown, setBreakCountdown] = useState(0);

  // Update countdown during break
  useEffect(() => {
    if (snapshot.state !== "BREAK_ACTIVE") return;

    const interval = setInterval(() => {
      // Force re-read (breakRemainingMin is computed from the snapshot)
      setBreakCountdown(snapshot.breakRemainingMin);
    }, 1000);

    return () => clearInterval(interval);
  }, [snapshot.state, snapshot.breakRemainingMin]);

  // ── Alert colors by state ──
  const alertConfig: Record<
    string,
    { bg: string; border: string; iconColor: string; title: string }
  > = {
    WARN: {
      bg: "bg-cognitive-moderate/10",
      border: "border-cognitive-moderate/40",
      iconColor: "text-cognitive-moderate",
      title: "Attention Check",
    },
    BREAK_SUGGESTED: {
      bg: "bg-cognitive-risk/10",
      border: "border-cognitive-risk/40",
      iconColor: "text-cognitive-risk",
      title: "Break Suggested",
    },
    CRITICAL: {
      bg: "bg-cognitive-critical/10",
      border: "border-cognitive-critical/40",
      iconColor: "text-cognitive-critical",
      title: "Fatigue Critical",
    },
    BREAK_ACTIVE: {
      bg: "bg-primary/10",
      border: "border-primary/40",
      iconColor: "text-primary",
      title: "Break Time",
    },
  };

  const showAlertOverlay =
    snapshot.showAlert &&
    (snapshot.state === "WARN" ||
      snapshot.state === "BREAK_SUGGESTED" ||
      snapshot.state === "CRITICAL");

  const showBreakTimer = snapshot.state === "BREAK_ACTIVE";

  if (!showAlertOverlay && !showBreakTimer) return null;

  const cfg = alertConfig[snapshot.state] || alertConfig.WARN;

  return (
    <AnimatePresence>
      {/* ── Alert Overlay ── */}
      {showAlertOverlay && (
        <motion.div
          key="fatigue-alert"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]"
        >
          <div
            className={`rounded-xl border-2 ${cfg.bg} ${cfg.border} shadow-2xl backdrop-blur-xl overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${cfg.iconColor}`} />
                <h3 className={`font-semibold text-sm ${cfg.iconColor}`}>
                  {cfg.title}
                </h3>
              </div>
              <button
                onClick={dismiss}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Message */}
            <div className="px-4 pb-3">
              <p className="text-sm text-foreground leading-relaxed">
                {snapshot.alertMessage}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                <span>
                  Fatigue: {(snapshot.latestFatigue * 100).toFixed(0)}%
                </span>
                <span>•</span>
                <span>
                  Suggested break: {snapshot.suggestedBreakMin} min
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 p-4 pt-2 border-t border-border/30">
              <p className="text-xs text-center text-muted-foreground mb-1">
                How long would you like to rest?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => startBreak(5)}
                  className="gap-2 flex-1 bg-primary hover:bg-primary/90"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  5 Minutes
                </Button>
                <Button
                  size="sm"
                  onClick={() => startBreak(10)}
                  className="gap-2 flex-1 bg-primary hover:bg-primary/90"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  10 Minutes
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismiss}
                className="text-muted-foreground hover:text-foreground w-full"
              >
                I'll keep working
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Break Timer Overlay ── */}
      {showBreakTimer && (
        <>
          {/* Dimming Overlay */}
          <motion.div
            key="dim-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Timer Card */}
          <motion.div
            key="break-timer"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-4 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)]"
          >
          <div
            className={`rounded-xl border-2 ${cfg.bg} ${cfg.border} shadow-2xl backdrop-blur-xl overflow-hidden`}
          >
            <div className="p-5 text-center">
              <Coffee className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">
                Break Time
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Step away, stretch, rest your eyes
              </p>

              {/* Countdown */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <Timer className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold font-mono text-primary">
                  {formatTime(snapshot.breakRemainingMin)}
                </span>
              </div>

              {/* Progress */}
              <div className="w-full h-2 rounded-full bg-muted mb-4">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{
                    width: `${Math.max(
                      0,
                      100 -
                        (snapshot.breakRemainingMin /
                          snapshot.suggestedBreakMin) *
                          100,
                    )}%`,
                  }}
                  transition={{ duration: 1 }}
                />
              </div>

              <Button
                size="sm"
                onClick={endBreak}
                variant="outline"
                className="gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                Ready to Focus
              </Button>
            </div>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function formatTime(minutes: number): string {
  const totalSec = Math.max(0, Math.round(minutes * 60));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default FatigueAlert;
