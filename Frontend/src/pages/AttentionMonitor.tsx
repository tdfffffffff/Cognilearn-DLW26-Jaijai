import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Line,
} from "recharts";
import {
  Eye,
  Activity,
  Clock,
  Settings2,
  Shield,
  Zap,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DrowsinessMonitor from "@/components/DrowsinessMonitor";
import FatigueAlert from "@/components/FatigueAlert";
import { useWorkBreakCoach } from "@/context/WorkBreakCoachContext";
import type { FatiguePayload } from "@/lib/fatigueEngine";

// ── History point for charts ──
interface DataPoint {
  time: string;
  ear: number;
  fatigue: number;
}

const MAX_HISTORY = 60; // keep last 60 points ~5 min at 5s interval

// ── State label / colour helpers ──
const stateLabel: Record<string, string> = {
  FOCUS: "Focused",
  WARN: "Getting Tired",
  BREAK_SUGGESTED: "Break Needed",
  BREAK_ACTIVE: "On Break",
  CRITICAL: "Fatigue Critical",
};

const stateColor: Record<string, string> = {
  FOCUS: "text-cognitive-excellent",
  WARN: "text-cognitive-moderate",
  BREAK_SUGGESTED: "text-cognitive-risk",
  BREAK_ACTIVE: "text-primary",
  CRITICAL: "text-cognitive-critical",
};

const stateBg: Record<string, string> = {
  FOCUS: "bg-cognitive-excellent/10 border-cognitive-excellent/30",
  WARN: "bg-cognitive-moderate/10 border-cognitive-moderate/30",
  BREAK_SUGGESTED: "bg-cognitive-risk/10 border-cognitive-risk/30",
  BREAK_ACTIVE: "bg-primary/10 border-primary/30",
  CRITICAL: "bg-cognitive-critical/10 border-cognitive-critical/30",
};

const AttentionMonitor = () => {
  const { snapshot, handleFatigueUpdate, resetProfile } = useWorkBreakCoach();

  // Live metrics from camera
  const [livePayload, setLivePayload] = useState<FatiguePayload | null>(null);

  // Timeline history for charts
  const [history, setHistory] = useState<DataPoint[]>([]);
  const seqRef = useRef(0);

  // Session start
  const sessionStart = useRef(Date.now());
  const elapsed = () => {
    const s = Math.floor((Date.now() - sessionStart.current) / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m ${s % 60}s`;
  };

  // Camera callback → feeds both local state & coach
  const onFatigueUpdate = useCallback(
    (p: FatiguePayload) => {
      setLivePayload(p);
      handleFatigueUpdate(p);

      seqRef.current += 1;
      const now = new Date();
      const stamp = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      setHistory((prev) => {
        const next = [
          ...prev,
          { time: stamp, ear: +p.ear.toFixed(3), fatigue: +(p.fatigueScore * 100).toFixed(1) },
        ];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
    },
    [handleFatigueUpdate],
  );

  // ── Derived values ──
  const ear = livePayload?.ear ?? 0;
  const fatiguePercent = (livePayload?.fatigueScore ?? 0) * 100;
  const bpm = livePayload?.blinkPerMin ?? 0;
  const perclos = (livePayload?.perclos60s ?? 0) * 100;

  // Coach profile settings
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Attention Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            On-device fatigue detection &amp; adaptive work-break coaching
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings((v) => !v)}
            className="gap-1.5"
          >
            <Settings2 className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* ── Fatigue Alert (floating) ── */}
      <FatigueAlert />

      {/* ── Settings Panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                Coach Profile
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetProfile}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Focus Duration</span>
                <p className="font-mono font-bold">
                  {snapshot.profile.preferredFocusMin} min
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Break Duration</span>
                <p className="font-mono font-bold">
                  {snapshot.profile.preferredBreakMin} min
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Warn Threshold</span>
                <p className="font-mono font-bold">
                  {snapshot.profile.warnThreshold.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Break Threshold</span>
                <p className="font-mono font-bold">
                  {snapshot.profile.breakThreshold.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Critical</span>
                <p className="font-mono font-bold">
                  {snapshot.profile.criticalThreshold.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Cooldown</span>
                <p className="font-mono font-bold">
                  {snapshot.profile.cooldownMin} min
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Dismissals Today</span>
                <p className="font-mono font-bold">
                  {snapshot.profile.dismissCountToday}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Fatigue Slope</span>
                <p className="font-mono font-bold">
                  {snapshot.profile.fatigueSlopeEstimate.toFixed(3)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2-column: Camera + Live Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Feed */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DrowsinessMonitor onFatigueUpdate={onFatigueUpdate} debug={false} />
        </motion.div>

        {/* Live Status Cards */}
        <div className="space-y-4">
          {/* Coach State */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-4 ${stateBg[snapshot.state] ?? stateBg.FOCUS}`}
          >
            <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
              Coach State
            </p>
            <p
              className={`text-lg font-bold ${stateColor[snapshot.state] ?? stateColor.FOCUS}`}
            >
              {stateLabel[snapshot.state] ?? snapshot.state}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Focus elapsed: {snapshot.focusElapsedMin.toFixed(1)} min
            </p>
          </motion.div>

          {/* Metric grid */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass rounded-xl p-4"
            >
              <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
                <Eye className="w-3 h-3 inline mr-1" />
                EAR
              </p>
              <p className="text-lg font-bold font-mono text-primary">
                {ear.toFixed(3)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Threshold: 0.21
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-4"
            >
              <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
                <Zap className="w-3 h-3 inline mr-1" />
                Fatigue
              </p>
              <p
                className={`text-lg font-bold ${
                  fatiguePercent > 70
                    ? "text-cognitive-critical"
                    : fatiguePercent > 40
                      ? "text-cognitive-moderate"
                      : "text-cognitive-good"
                }`}
              >
                {fatiguePercent.toFixed(0)}%
              </p>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <motion.div
                  className={`h-full rounded-full ${
                    fatiguePercent > 70
                      ? "bg-cognitive-critical"
                      : fatiguePercent > 40
                        ? "bg-cognitive-moderate"
                        : "bg-cognitive-good"
                  }`}
                  animate={{ width: `${fatiguePercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass rounded-xl p-4"
            >
              <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
                PERCLOS (60s)
              </p>
              <p className="text-lg font-bold font-mono text-foreground">
                {perclos.toFixed(1)}%
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-4"
            >
              <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
                Blinks / min
              </p>
              <p className="text-lg font-bold font-mono text-foreground">
                {bpm.toFixed(0)}
              </p>
            </motion.div>
          </div>

          {/* Session + Privacy */}
          <div className="flex gap-3">
            <div className="glass rounded-xl p-4 flex-1">
              <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
                <Clock className="w-3 h-3 inline mr-1" />
                Session
              </p>
              <p className="text-sm font-bold text-foreground">{elapsed()}</p>
            </div>
            <div className="glass rounded-xl p-4 flex-1">
              <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
                <Shield className="w-3 h-3 inline mr-1" />
                Privacy
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                All processing on-device.
                <br />
                No video stored or sent.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Real-time Charts ── */}
      {history.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* EAR Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                EAR Signal Timeline
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient
                    id="earGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(187,72%,53%)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(187,72%,53%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(222,30%,18%)"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 0.45]}
                  tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222,44%,9%)",
                    border: "1px solid hsl(222,30%,18%)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ear"
                  stroke="hsl(187,72%,53%)"
                  fill="url(#earGradient)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                {/* Drowsiness threshold */}
                <Line
                  type="monotone"
                  dataKey={() => 0.21}
                  stroke="hsl(0,72%,55%)"
                  strokeDasharray="5 5"
                  dot={false}
                  strokeWidth={1}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-2">
              Red dashed line = drowsiness threshold (EAR &lt; 0.21)
            </p>
          </motion.div>

          {/* Fatigue Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-cognitive-risk" />
              <h2 className="text-sm font-semibold text-foreground">
                Fatigue Over Session
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient
                    id="fatigueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(25,90%,55%)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(25,90%,55%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(222,30%,18%)"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222,44%,9%)",
                    border: "1px solid hsl(222,30%,18%)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="fatigue"
                  stroke="hsl(25,90%,55%)"
                  fill="url(#fatigueGradient)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AttentionMonitor;
