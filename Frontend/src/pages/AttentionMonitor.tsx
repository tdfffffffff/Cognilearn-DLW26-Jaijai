import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";
import { Eye, AlertTriangle, Clock, Activity, Bell } from "lucide-react";
import { attentionStates, currentAttention, fatigueAlerts } from "@/data/mockData";

const stateColors: Record<string, string> = {
  focused: "text-cognitive-excellent",
  engaged: "text-cognitive-good",
  wandering: "text-cognitive-moderate",
  drowsy: "text-cognitive-critical",
  break: "text-muted-foreground",
};

const stateBg: Record<string, string> = {
  focused: "bg-cognitive-excellent/10 border-cognitive-excellent/30",
  engaged: "bg-cognitive-good/10 border-cognitive-good/30",
  wandering: "bg-cognitive-moderate/10 border-cognitive-moderate/30",
  drowsy: "bg-cognitive-critical/10 border-cognitive-critical/30",
  break: "bg-muted border-border",
};

const AttentionMonitor = () => {
  const [liveEAR, setLiveEAR] = useState(currentAttention.ear);
  const [liveFatigue, setLiveFatigue] = useState(currentAttention.fatigueLevel);

  // Simulate live EAR fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveEAR(prev => {
        const delta = (Math.random() - 0.5) * 0.03;
        return Math.max(0.15, Math.min(0.40, prev + delta));
      });
      setLiveFatigue(prev => {
        const delta = (Math.random() - 0.3) * 2;
        return Math.max(0, Math.min(100, prev + delta));
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attention Monitor</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time cognitive state tracking with fatigue detection</p>
      </div>

      {/* Live Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border p-4 ${stateBg[currentAttention.state]}`}>
          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Current State</p>
          <p className={`text-lg font-bold capitalize ${stateColors[currentAttention.state]}`}>{currentAttention.state}</p>
          <p className="text-xs text-muted-foreground">{(currentAttention.confidence * 100).toFixed(0)}% confidence</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">EAR Signal</p>
          <p className="text-lg font-bold font-mono text-primary">{liveEAR.toFixed(3)}</p>
          <p className="text-xs text-muted-foreground">Threshold: 0.21</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Fatigue Level</p>
          <p className={`text-lg font-bold ${liveFatigue > 50 ? "text-cognitive-risk" : liveFatigue > 30 ? "text-cognitive-moderate" : "text-cognitive-good"}`}>
            {liveFatigue.toFixed(0)}%
          </p>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <motion.div
              className={`h-full rounded-full ${liveFatigue > 50 ? "bg-cognitive-critical" : liveFatigue > 30 ? "bg-cognitive-moderate" : "bg-cognitive-good"}`}
              animate={{ width: `${liveFatigue}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Session</p>
          <p className="text-lg font-bold text-foreground">{currentAttention.sessionDuration}</p>
          <p className="text-xs text-muted-foreground">{currentAttention.alertsToday} alerts today</p>
        </motion.div>
      </div>

      {/* EAR Timeline */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">EAR Signal Timeline</h2>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={attentionStates}>
            <defs>
              <linearGradient id="earGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(187,72%,53%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(187,72%,53%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,18%)" />
            <XAxis dataKey="time" tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }} />
            <YAxis domain={[0, 0.4]} tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(222,44%,9%)", border: "1px solid hsl(222,30%,18%)", borderRadius: "8px", fontSize: 12 }} />
            <Area type="monotone" dataKey="ear" stroke="hsl(187,72%,53%)" fill="url(#earGradient)" strokeWidth={2} />
            {/* Drowsiness threshold line */}
            <Line type="monotone" dataKey={() => 0.21} stroke="hsl(0,72%,55%)" strokeDasharray="5 5" dot={false} strokeWidth={1} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted-foreground mt-2">Red dashed line = drowsiness threshold (EAR &lt; 0.21)</p>
      </motion.div>

      {/* Fatigue Timeline + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Fatigue Over Session</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={attentionStates}>
              <defs>
                <linearGradient id="fatigueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(25,90%,55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(25,90%,55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,18%)" />
              <XAxis dataKey="time" tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(222,44%,9%)", border: "1px solid hsl(222,30%,18%)", borderRadius: "8px", fontSize: 12 }} />
              <Area type="monotone" dataKey="fatigue" stroke="hsl(25,90%,55%)" fill="url(#fatigueGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-cognitive-risk" />
            <h2 className="text-sm font-semibold text-foreground">Fatigue Detection Alerts</h2>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {fatigueAlerts.map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-3 rounded-lg border ${alert.type === "critical" ? "bg-cognitive-critical/5 border-cognitive-critical/20" : "bg-cognitive-moderate/5 border-cognitive-moderate/20"}`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${alert.type === "critical" ? "text-cognitive-critical" : "text-cognitive-moderate"}`} />
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{alert.time}</p>
                      <p className="text-xs text-foreground mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AttentionMonitor;
