import { motion } from "framer-motion";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { ArrowDown, ArrowUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { errorTypeRadar, topicBreakdown, shapExplanations, forgettingCurveData } from "@/data/mockData";

const riskColors: Record<string, string> = {
  excellent: "text-cognitive-excellent",
  good: "text-cognitive-good",
  moderate: "text-cognitive-moderate",
  risk: "text-cognitive-risk",
  critical: "text-cognitive-critical",
};

const riskBg: Record<string, string> = {
  excellent: "bg-cognitive-excellent/10 border-cognitive-excellent/20",
  good: "bg-cognitive-good/10 border-cognitive-good/20",
  moderate: "bg-cognitive-moderate/10 border-cognitive-moderate/20",
  risk: "bg-cognitive-risk/10 border-cognitive-risk/20",
  critical: "bg-cognitive-critical/10 border-cognitive-critical/20",
};

const CognitiveFingerprint = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cognitive Fingerprint</h1>
        <p className="text-sm text-muted-foreground mt-1">Your unique learning pattern analysis with explainable AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-sm font-semibold text-foreground mb-1">Error Type Profile</h2>
          <p className="text-xs text-muted-foreground mb-4">Higher = more accuracy in this error category</p>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={errorTypeRadar}>
              <PolarGrid stroke="hsl(222,30%,18%)" />
              <PolarAngleAxis dataKey="type" tick={{ fill: "hsl(215,20%,55%)", fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="hsl(187,72%,53%)"
                fill="hsl(187,72%,53%)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Topic Breakdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Topic Breakdown</h2>
          <div className="space-y-3">
            {topicBreakdown.map((topic) => (
              <div key={topic.topic} className={`rounded-lg border p-3 ${riskBg[topic.riskLevel]}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{topic.topic}</span>
                  <span className={`text-xs font-mono uppercase ${riskColors[topic.riskLevel]}`}>
                    {topic.riskLevel}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${topic.mastery}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{topic.mastery}% mastery</span>
                  <span className="text-[10px] text-muted-foreground">{topic.errors} errors</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* SHAP Explanations */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-xl p-6"
      >
        <h2 className="text-sm font-semibold text-foreground mb-1">AI Explanation (SHAP)</h2>
        <p className="text-xs text-muted-foreground mb-4">Why the model made these predictions — in plain English</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shapExplanations.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-1.5 rounded-md ${item.direction === "positive" ? "bg-cognitive-good/10" : "bg-cognitive-risk/10"}`}>
                  {item.direction === "positive" ? (
                    <ArrowUp className="w-3.5 h-3.5 text-cognitive-good" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-cognitive-risk" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground mb-1">{item.feature}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.explanation}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${item.direction === "positive" ? "bg-cognitive-good" : "bg-cognitive-risk"}`}
                        style={{ width: `${item.impact * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {item.direction === "positive" ? "+" : "-"}{(item.impact * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Forgetting Curve */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-4 h-4 text-cognitive-risk" />
          <h2 className="text-sm font-semibold text-foreground">Forgetting Curves</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Predicted retention decay per topic over time</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={forgettingCurveData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,18%)" />
            <XAxis dataKey="day" tick={{ fill: "hsl(215,20%,55%)", fontSize: 11 }} label={{ value: "Days", position: "insideBottom", offset: -5, fill: "hsl(215,20%,55%)" }} />
            <YAxis tick={{ fill: "hsl(215,20%,55%)", fontSize: 11 }} label={{ value: "Retention %", angle: -90, position: "insideLeft", fill: "hsl(215,20%,55%)" }} />
            <Tooltip contentStyle={{ background: "hsl(222,44%,9%)", border: "1px solid hsl(222,30%,18%)", borderRadius: "8px", fontSize: 12 }} />
            <Line type="monotone" dataKey="Integration" stroke="hsl(0,72%,55%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Taylor Series" stroke="hsl(25,90%,55%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Eigenvalues" stroke="hsl(45,85%,55%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Bayes" stroke="hsl(187,72%,53%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};

export default CognitiveFingerprint;
