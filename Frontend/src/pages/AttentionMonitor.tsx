import { useState, useRef, useEffect, useCallback } from "react";
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
  EyeOff,
  Activity,
  Clock,
  Settings2,
  Shield,
  Zap,
  RotateCcw,
  Camera,
  CameraOff,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FatigueAlert from "@/components/FatigueAlert";
import FatigueInsights from "@/components/FatigueInsights";
import { useWorkBreakCoach } from "@/context/WorkBreakCoachContext";
import { useFatigueStream } from "@/context/FatigueStreamContext";

function formatElapsed(sec: number): string {
  const totalSec = Math.max(0, Math.floor(sec));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

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
  const { snapshot, resetProfile } = useWorkBreakCoach();
  const { livePayload, history, sessionStartTs, cameraEnabled, setCameraEnabled, mediaStream, faceDetected, isMonitorInitializing, permissionDenied } = useFatigueStream();

  // Video preview — shares the BackgroundFatigueMonitor's MediaStream
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoPreviewRef.current;
    if (!video) return;
    if (mediaStream) {
      video.srcObject = mediaStream;
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [mediaStream]);

  // Camera overlay status config
  const cameraStatusCfg = (livePayload?.fatigueScore ?? 0) >= 0.7
    ? { label: "Take a Break", color: "text-cognitive-critical", bg: "bg-cognitive-critical/10 border-cognitive-critical/30", Icon: AlertTriangle }
    : (livePayload?.fatigueScore ?? 0) >= 0.4
    ? { label: "Getting Tired", color: "text-cognitive-moderate", bg: "bg-cognitive-moderate/10 border-cognitive-moderate/30", Icon: EyeOff }
    : { label: "OK \u2014 Focused", color: "text-cognitive-good", bg: "bg-cognitive-good/10 border-cognitive-good/30", Icon: Eye };

  // ── 1-second tick for live elapsed counters ──
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = useCallback(() => {
    if (!sessionStartTs) return "0m 0s";
    const s = Math.floor((Date.now() - sessionStartTs) / 1000);
    return formatElapsed(s);
  }, [sessionStartTs]);

  // Live focus elapsed — only counts while camera is enabled
  const liveFocusElapsedMin =
    cameraEnabled && snapshot.state !== "BREAK_ACTIVE"
      ? (Date.now() - snapshot.focusStartTime) / 60_000
      : 0;

  const peakFatiguePoint =
    history.length > 0
      ? history.reduce((max, point) =>
          point.fatigue > max.fatigue ? point : max,
        )
      : null;

  const lowestFatiguePoint =
    history.length > 0
      ? history.reduce((min, point) =>
          point.fatigue < min.fatigue ? point : min,
        )
      : null;

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
          className="glass rounded-xl p-6"
        >
          <div className="space-y-4">
            {/* Camera Controls */}
            <div className="flex items-center gap-3">
              {!cameraEnabled && !isMonitorInitializing ? (
                <Button onClick={() => setCameraEnabled(true)} className="gap-2">
                  <Camera className="w-4 h-4" />
                  Enable Camera
                </Button>
              ) : isMonitorInitializing ? (
                <Button disabled className="gap-2">
                  <Camera className="w-4 h-4" />
                  Initializing camera...
                </Button>
              ) : (
                <Button
                  onClick={() => setCameraEnabled(false)}
                  variant="outline"
                  className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <CameraOff className="w-4 h-4" /> Disable Camera
                </Button>
              )}

              {cameraEnabled && !isMonitorInitializing && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-cognitive-good animate-pulse" />
                  <span className="text-xs text-cognitive-good font-mono">LIVE</span>
                </motion.div>
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

            {/* Video Preview */}
            {cameraEnabled && mediaStream && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-xl overflow-hidden border border-border bg-black"
              >
                <video
                  ref={videoPreviewRef}
                  className="w-full max-h-[300px] object-cover"
                  playsInline
                  muted
                  autoPlay
                  style={{ transform: "scaleX(-1)" }}
                />

                {/* Status Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`${cameraStatusCfg.bg} ${cameraStatusCfg.color} text-[10px] backdrop-blur-md`}
                  >
                    <cameraStatusCfg.Icon className="w-3 h-3 mr-1" />
                    {cameraStatusCfg.label}
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
          </div>
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
              Focus elapsed: {liveFocusElapsedMin.toFixed(1)} min
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
                  dataKey="clockTime"
                  minTickGap={28}
                  tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 0.45]}
                  tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
                />
                <Tooltip
                  labelFormatter={(label, payload) => {
                    const point = payload?.[0]?.payload as DataPoint | undefined;
                    if (!point) return `Time: ${label}`;
                    return `Time: ${point.clockTime} • Session: ${point.elapsedLabel}`;
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "ear") return [value.toFixed(3), "EAR"];
                    return [value, name];
                  }}
                  contentStyle={{
                    background: "hsl(222,44%,9%)",
                    border: "1px solid hsl(222,30%,18%)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(215,20%,75%)" }}
                  itemStyle={{ color: "hsl(215,20%,88%)" }}
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
                  dataKey="clockTime"
                  minTickGap={28}
                  tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
                />
                <Tooltip
                  labelFormatter={(label, payload) => {
                    const point = payload?.[0]?.payload as DataPoint | undefined;
                    if (!point) return `Time: ${label}`;
                    return `Time: ${point.clockTime} • Session: ${point.elapsedLabel}`;
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "fatigue") return [`${Number(value).toFixed(1)}%`, "Fatigue"];
                    return [value, name];
                  }}
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
            {peakFatiguePoint && lowestFatiguePoint && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-md border border-cognitive-risk/30 bg-cognitive-risk/10 p-2">
                  <p className="text-muted-foreground">Most fatigue</p>
                  <p className="font-medium text-cognitive-risk">
                    {peakFatiguePoint.fatigue.toFixed(1)}% at {peakFatiguePoint.clockTime}
                  </p>
                  <p className="text-muted-foreground">Session {peakFatiguePoint.elapsedLabel}</p>
                </div>
                <div className="rounded-md border border-cognitive-good/30 bg-cognitive-good/10 p-2">
                  <p className="text-muted-foreground">Least fatigue</p>
                  <p className="font-medium text-cognitive-good">
                    {lowestFatiguePoint.fatigue.toFixed(1)}% at {lowestFatiguePoint.clockTime}
                  </p>
                  <p className="text-muted-foreground">Session {lowestFatiguePoint.elapsedLabel}</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Fatigue Insights (Daily / Weekly / Time-of-Day / Work-Rest) ── */}
      <FatigueInsights />
    </div>
  );
};

export default AttentionMonitor;
