import { motion } from "framer-motion";
import { Clock, Flame, TrendingUp, AlertTriangle, Coffee, BookOpen, Zap } from "lucide-react";
import { riskTopics, deepWorkWindows, momentumState } from "@/data/mockData";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const StudyBrief = () => {
  const weeklyData = momentumState.weeklyTrend.map((v, i) => ({ day: weekDays[i], value: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Study Brief</h1>
          <p className="text-sm text-muted-foreground mt-1">Your adaptive plan for today — March 1, 2026</p>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-cognitive-moderate/10 border border-cognitive-moderate/20"
        >
          <Flame className="w-4 h-4 text-cognitive-moderate" />
          <span className="text-sm font-semibold text-cognitive-moderate">
            Momentum: {momentumState.state}
          </span>
          <span className="text-xs text-muted-foreground ml-1">
            {momentumState.streak} day streak
          </span>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Topics */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-cognitive-risk" />
            <h2 className="text-sm font-semibold text-foreground">Today's Risk Topics</h2>
          </div>
          <div className="space-y-3">
            {riskTopics.map((topic, i) => (
              <motion.div
                key={topic.topic}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{topic.topic}</p>
                  <p className="text-xs text-muted-foreground">Decay: {topic.decay} · Review: {topic.nextReview}</p>
                </div>
                <div className="w-24">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Risk</span>
                    <span>{(topic.risk * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-cognitive-risk"
                      style={{ width: `${topic.risk * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Weekly Trend */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Weekly Progress</h2>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">{momentumState.todayProgress}%</p>
          <p className="text-xs text-muted-foreground mb-4">Today's completion</p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Line type="monotone" dataKey="value" stroke="hsl(187,72%,53%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(187,72%,53%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Deep Work Schedule */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Deep Work Window & Adaptive Break Schedule</h2>
        </div>
        <div className="relative">
          {deepWorkWindows.map((window, i) => {
            const Icon = window.type === "break" ? Coffee : window.type === "deep" ? Zap : BookOpen;
            const bgClass = window.type === "break"
              ? "bg-muted border-border"
              : window.type === "deep"
              ? "bg-primary/5 border-primary/20"
              : "bg-cognitive-good/5 border-cognitive-good/20";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className={`flex items-center gap-4 p-3 rounded-lg border mb-2 ${bgClass}`}
              >
                <div className="w-24 text-xs font-mono text-muted-foreground">
                  {window.start}–{window.end}
                </div>
                <Icon className={`w-4 h-4 flex-shrink-0 ${window.type === "deep" ? "text-primary" : window.type === "break" ? "text-muted-foreground" : "text-cognitive-good"}`} />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{window.topic}</p>
                </div>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                  window.type === "deep" ? "bg-primary/10 text-primary" : 
                  window.type === "break" ? "bg-muted text-muted-foreground" : 
                  "bg-cognitive-good/10 text-cognitive-good"
                }`}>
                  {window.type}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default StudyBrief;
