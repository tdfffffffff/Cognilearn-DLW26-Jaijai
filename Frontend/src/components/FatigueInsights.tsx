/**
 * FatigueInsights — analytics dashboard for fatigue patterns.
 *
 * Sub-sections:
 *  1. Work-Rest Cycle Optimizer (adaptive Pomodoro recommendation)
 *  2. Time-of-Day Fatigue Analysis (morning / afternoon / evening / night)
 *  3. Today's Daily Report
 *  4. Weekly Report (iOS Screen Time-style comparison)
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";
import {
  Sun,
  Sunset,
  Moon,
  CloudMoon,
  Clock,
  Timer,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  Brain,
  Coffee,
  Zap,
  ChevronLeft,
  ChevronRight,
  FileText,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fatigueAnalytics,
  type DailyReport,
  type WeeklyReport,
  type TimeOfDayBucket,
} from "@/lib/fatigueAnalyticsStore";

// ═══════════════════════════════════════════════════════════════════════════════
// Time-of-day icon helper
// ═══════════════════════════════════════════════════════════════════════════════

const periodIcon: Record<string, typeof Sun> = {
  Morning: Sun,
  Afternoon: Sunset,
  Evening: CloudMoon,
  Night: Moon,
};

const periodColor: Record<string, string> = {
  Morning: "hsl(45, 90%, 55%)",
  Afternoon: "hsl(25, 90%, 55%)",
  Evening: "hsl(270, 60%, 55%)",
  Night: "hsl(220, 60%, 45%)",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = "daily" | "weekly" | "time-of-day" | "work-rest";

const FatigueInsights: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("daily");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Load data
  const todayReport = useMemo(() => fatigueAnalytics.getTodayReport(), []);
  const allReports = useMemo(() => fatigueAnalytics.getAllDailyReports(), []);
  const weeklyReport = useMemo(() => fatigueAnalytics.getCurrentWeeklyReport(), []);
  const totalDays = fatigueAnalytics.totalDaysTracked;

  // Selected daily report
  const activeReport = useMemo(() => {
    if (selectedDate) return fatigueAnalytics.getDailyReport(selectedDate);
    return todayReport;
  }, [selectedDate, todayReport]);

  const tabs: { id: TabId; label: string; icon: typeof Sun }[] = [
    { id: "daily", label: "Daily Report", icon: FileText },
    { id: "weekly", label: "Weekly Trend", icon: BarChart3 },
    { id: "time-of-day", label: "Peak Hours", icon: Clock },
    { id: "work-rest", label: "Work-Rest Cycle", icon: Timer },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Fatigue Insights</h2>
        {totalDays > 0 && (
          <span className="text-xs text-muted-foreground ml-auto font-mono">
            {totalDays} day{totalDays !== 1 ? "s" : ""} tracked
          </span>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/30 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* No data state */}
      {totalDays === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">
            No fatigue data recorded yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Enable the camera and start a study session. Data is automatically collected every 30 seconds and stored on your device.
          </p>
        </div>
      )}

      {/* Tab Content */}
      {totalDays > 0 && (
        <AnimatePresence mode="wait">
          {activeTab === "daily" && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <DailyReportView
                report={activeReport}
                allReports={allReports}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </motion.div>
          )}
          {activeTab === "weekly" && (
            <motion.div
              key="weekly"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <WeeklyReportView report={weeklyReport} />
            </motion.div>
          )}
          {activeTab === "time-of-day" && (
            <motion.div
              key="tod"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <TimeOfDayView report={activeReport} weeklyReport={weeklyReport} />
            </motion.div>
          )}
          {activeTab === "work-rest" && (
            <motion.div
              key="wr"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <WorkRestView report={activeReport} weeklyReport={weeklyReport} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default FatigueInsights;

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════════

// ── Daily Report ──

function DailyReportView({
  report,
  allReports,
  selectedDate,
  onSelectDate,
}: {
  report: DailyReport | null;
  allReports: DailyReport[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  if (!report) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground">
          No data for {selectedDate ?? "today"} yet. Start a camera session to begin tracking.
        </p>
      </div>
    );
  }

  const currentIdx = allReports.findIndex((r) => r.date === report.date);
  const canGoPrev = currentIdx < allReports.length - 1;
  const canGoNext = currentIdx > 0;

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={!canGoPrev}
          onClick={() => canGoPrev && onSelectDate(allReports[currentIdx + 1].date)}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{formatDateFull(report.date)}</p>
          <p className="text-[10px] text-muted-foreground">{report.sessions} session{report.sessions !== 1 ? "s" : ""}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canGoNext}
          onClick={() => canGoNext ? onSelectDate(allReports[currentIdx - 1].date) : onSelectDate(null)}
          className="gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Focus Time"
          value={`${report.totalFocusMin.toFixed(0)} min`}
          sub={`of ${report.totalSessionMin.toFixed(0)} min total`}
          color="text-cognitive-good"
        />
        <SummaryCard
          label="Focus Rate"
          value={`${report.focusPercent.toFixed(0)}%`}
          sub={report.focusPercent >= 70 ? "Great focus!" : report.focusPercent >= 50 ? "Decent" : "Room to improve"}
          color={report.focusPercent >= 70 ? "text-cognitive-excellent" : report.focusPercent >= 50 ? "text-cognitive-moderate" : "text-cognitive-risk"}
        />
        <SummaryCard
          label="Avg Fatigue"
          value={`${report.avgFatigue.toFixed(0)}%`}
          sub={`Peak: ${report.peakFatigue.toFixed(0)}% at ${report.peakFatigueTime}`}
          color={report.avgFatigue < 30 ? "text-cognitive-good" : report.avgFatigue < 50 ? "text-cognitive-moderate" : "text-cognitive-risk"}
        />
        <SummaryCard
          label="Best Period"
          value={report.bestPeriod}
          sub={report.worstPeriod !== report.bestPeriod ? `Worst: ${report.worstPeriod}` : "Consistent focus"}
          color="text-primary"
        />
      </div>

      {/* Fatigue Onset */}
      {report.fatigueOnsetMin !== null && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-cognitive-risk" />
            <p className="text-xs text-muted-foreground">
              Fatigue onset after <span className="font-bold text-foreground">{report.fatigueOnsetMin.toFixed(0)} minutes</span> of focus.
              Recommended cycle: <span className="font-bold text-primary">{report.recommendedWorkMin} min work / {report.recommendedBreakMin} min break</span>.
            </p>
          </div>
        </div>
      )}

      {/* Hourly Fatigue Chart */}
      {report.hourlyFatigue.length > 1 && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Fatigue by Hour</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={report.hourlyFatigue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,18%)" />
              <XAxis
                dataKey="hour"
                tickFormatter={(h) => `${h}:00`}
                tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
              />
              <Tooltip
                labelFormatter={(h) => `${h}:00 – ${h}:59`}
                formatter={(v: number) => [`${v.toFixed(1)}%`, "Avg Fatigue"]}
                contentStyle={{
                  background: "hsl(222,44%,9%)",
                  border: "1px solid hsl(222,30%,18%)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {report.hourlyFatigue.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.avg > 60 ? "hsl(0,72%,55%)" : entry.avg > 35 ? "hsl(25,90%,55%)" : "hsl(170,55%,45%)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Weekly Report ──

function WeeklyReportView({ report }: { report: WeeklyReport | null }) {
  if (!report || !report.hasEnoughData) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground">
          Weekly report needs at least 2 days of data.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Keep using the camera during study sessions — your weekly trend will appear here once enough data is collected.
        </p>
      </div>
    );
  }

  const TrendIcon = report.focusTrend > 0 ? TrendingUp : report.focusTrend < 0 ? TrendingDown : Minus;
  const trendColor = report.focusTrend > 0 ? "text-cognitive-excellent" : report.focusTrend < 0 ? "text-cognitive-critical" : "text-muted-foreground";
  const trendLabel = report.focusTrend > 0 ? `+${report.focusTrend.toFixed(1)}%` : `${report.focusTrend.toFixed(1)}%`;

  // Chart data: day-by-day focus minutes
  const chartData = report.days.map((d) => ({
    date: d.date.slice(5), // MM-DD
    focusMin: d.totalFocusMin,
    fatigue: d.avgFatigue,
    focusPercent: d.focusPercent,
    label: formatDateShort(d.date),
  }));

  return (
    <div className="space-y-4">
      {/* Week Header */}
      <div className="glass rounded-xl p-5">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
          {report.weekLabel}
        </p>

        {/* iOS Screen Time - style summary */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Avg Daily Focus</p>
            <p className="text-2xl font-bold text-primary">
              {report.avgDailyFocusMin.toFixed(0)}<span className="text-sm font-normal text-muted-foreground"> min</span>
            </p>
            <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-xs font-medium">{trendLabel} vs last week</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Avg Fatigue</p>
            <p className={`text-2xl font-bold ${report.avgDailyFatigue < 30 ? "text-cognitive-good" : report.avgDailyFatigue < 50 ? "text-cognitive-moderate" : "text-cognitive-risk"}`}>
              {report.avgDailyFatigue.toFixed(0)}%
            </p>
            <div className={`flex items-center gap-1 mt-1 ${report.fatigueTrend < 0 ? "text-cognitive-excellent" : report.fatigueTrend > 0 ? "text-cognitive-risk" : "text-muted-foreground"}`}>
              {report.fatigueTrend < 0 ? <TrendingDown className="w-3 h-3" /> : report.fatigueTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              <span className="text-xs font-medium">{report.fatigueTrend > 0 ? "+" : ""}{report.fatigueTrend.toFixed(1)}% vs last week</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Best Period</p>
            <p className="text-2xl font-bold text-foreground">{report.bestPeriodOverall}</p>
            <p className="text-xs text-muted-foreground mt-1">Most focused time</p>
          </div>
        </div>
      </div>

      {/* Day-by-Day Focus Chart (like Screen Time bar chart) */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Daily Focus Time</h3>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,18%)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
            />
            <YAxis
              tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
              label={{ value: "min", angle: -90, position: "insideLeft", fill: "hsl(215,20%,55%)" }}
            />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(0)} min`, "Focus Time"]}
              contentStyle={{
                background: "hsl(222,44%,9%)",
                border: "1px solid hsl(222,30%,18%)",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            <Bar dataKey="focusMin" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.focusPercent >= 70 ? "hsl(170,55%,45%)" : entry.focusPercent >= 50 ? "hsl(45,90%,55%)" : "hsl(25,90%,55%)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Day-by-Day Fatigue Trend */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-cognitive-risk" />
          <h3 className="text-sm font-semibold">Fatigue Trend</h3>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,18%)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }}
            />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(1)}%`, "Avg Fatigue"]}
              contentStyle={{
                background: "hsl(222,44%,9%)",
                border: "1px solid hsl(222,30%,18%)",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="fatigue"
              stroke="hsl(25,90%,55%)"
              strokeWidth={2}
              dot={{ r: 4, fill: "hsl(25,90%,55%)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Best / Worst Day */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Best Day</p>
          <p className="text-sm font-bold text-cognitive-excellent">{formatDateFull(report.bestDay)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Most Fatigued Day</p>
          <p className="text-sm font-bold text-cognitive-risk">{formatDateFull(report.worstDay)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Time-of-Day Analysis ──

function TimeOfDayView({
  report,
  weeklyReport,
}: {
  report: DailyReport | null;
  weeklyReport: WeeklyReport | null;
}) {
  // Use weekly data if available, otherwise today's data
  const buckets: TimeOfDayBucket[] = useMemo(() => {
    if (weeklyReport && weeklyReport.hasEnoughData) {
      // Aggregate across all days in the week
      const aggregated: Record<string, { totalFatigue: number; totalFocus: number; totalMin: number; count: number }> = {};
      for (const day of weeklyReport.days) {
        for (const b of day.timeOfDay) {
          if (b.sampleCount === 0) continue;
          if (!aggregated[b.label]) aggregated[b.label] = { totalFatigue: 0, totalFocus: 0, totalMin: 0, count: 0 };
          aggregated[b.label].totalFatigue += b.avgFatigue * b.sampleCount;
          aggregated[b.label].totalFocus += b.avgFocusPercent * b.sampleCount;
          aggregated[b.label].totalMin += b.totalMinutes;
          aggregated[b.label].count += b.sampleCount;
        }
      }
      return ["Morning", "Afternoon", "Evening", "Night"].map((label) => {
        const a = aggregated[label];
        if (!a || a.count === 0) return { label, range: "", avgFatigue: 0, avgFocusPercent: 0, totalMinutes: 0, sampleCount: 0 };
        return {
          label,
          range: label === "Morning" ? "6 AM – 12 PM" : label === "Afternoon" ? "12 PM – 5 PM" : label === "Evening" ? "5 PM – 9 PM" : "9 PM – 6 AM",
          avgFatigue: +(a.totalFatigue / a.count).toFixed(1),
          avgFocusPercent: +(a.totalFocus / a.count).toFixed(1),
          totalMinutes: +a.totalMin.toFixed(1),
          sampleCount: a.count,
        };
      });
    }
    return report?.timeOfDay ?? [];
  }, [report, weeklyReport]);

  const bucketsWithData = buckets.filter((b) => b.sampleCount > 0);

  if (bucketsWithData.length === 0) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground">
          Not enough data for time-of-day analysis yet.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Study at different times during the day to discover when you focus best.
        </p>
      </div>
    );
  }

  const bestBucket = bucketsWithData.reduce((best, b) => b.avgFocusPercent > best.avgFocusPercent ? b : best);
  const worstBucket = bucketsWithData.reduce((worst, b) => b.avgFocusPercent < worst.avgFocusPercent ? b : worst);

  // Chart data
  const chartData = buckets.map((b) => ({
    name: b.label,
    fatigue: b.avgFatigue,
    focus: b.avgFocusPercent,
    minutes: b.totalMinutes,
    fill: periodColor[b.label] ?? "hsl(215,20%,55%)",
  }));

  return (
    <div className="space-y-4">
      {/* Insight Banner */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            {React.createElement(periodIcon[bestBucket.label] ?? Sun, { className: "w-5 h-5 text-primary" })}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              You focus best in the <span className="text-primary">{bestBucket.label}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bestBucket.avgFocusPercent.toFixed(0)}% focus rate with {bestBucket.avgFatigue.toFixed(0)}% avg fatigue.
              {worstBucket.label !== bestBucket.label && (
                <> You get fatigued the easiest in the <span className="font-medium text-cognitive-risk">{worstBucket.label}</span> ({worstBucket.avgFatigue.toFixed(0)}% avg fatigue).</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Time-of-Day Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {buckets.map((bucket) => {
          const Icon = periodIcon[bucket.label] ?? Sun;
          const isBest = bucket.label === bestBucket.label && bucketsWithData.length > 1;
          const isWorst = bucket.label === worstBucket.label && worstBucket.label !== bestBucket.label;
          return (
            <div
              key={bucket.label}
              className={`glass rounded-xl p-4 relative ${
                isBest ? "ring-1 ring-cognitive-excellent/50" : isWorst ? "ring-1 ring-cognitive-risk/30" : ""
              }`}
            >
              {isBest && (
                <span className="absolute -top-2 right-2 text-[9px] font-bold bg-cognitive-excellent/20 text-cognitive-excellent rounded-full px-2 py-0.5">
                  BEST
                </span>
              )}
              {isWorst && (
                <span className="absolute -top-2 right-2 text-[9px] font-bold bg-cognitive-risk/20 text-cognitive-risk rounded-full px-2 py-0.5">
                  MOST FATIGUE
                </span>
              )}
              <Icon className="w-5 h-5 mb-2" style={{ color: periodColor[bucket.label] }} />
              <p className="text-xs font-semibold text-foreground">{bucket.label}</p>
              <p className="text-[10px] text-muted-foreground">{bucket.range}</p>
              {bucket.sampleCount > 0 ? (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Focus</span>
                    <span className={bucket.avgFocusPercent >= 70 ? "text-cognitive-excellent" : bucket.avgFocusPercent >= 50 ? "text-cognitive-moderate" : "text-cognitive-risk"}>
                      {bucket.avgFocusPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        bucket.avgFocusPercent >= 70 ? "bg-cognitive-excellent" : bucket.avgFocusPercent >= 50 ? "bg-cognitive-moderate" : "bg-cognitive-risk"
                      }`}
                      style={{ width: `${Math.min(100, bucket.avgFocusPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Fatigue</span>
                    <span>{bucket.avgFatigue.toFixed(0)}%</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">{bucket.totalMinutes.toFixed(0)} min tracked</p>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-2">No data yet</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Focus vs Fatigue Bar Chart */}
      {bucketsWithData.length > 1 && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Focus vs Fatigue by Time of Day</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,18%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }} />
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${v.toFixed(1)}%`,
                  name === "focus" ? "Focus %" : "Fatigue %",
                ]}
                contentStyle={{
                  background: "hsl(222,44%,9%)",
                  border: "1px solid hsl(222,30%,18%)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="focus" fill="hsl(170,55%,45%)" radius={[4, 4, 0, 0]} name="Focus %" />
              <Bar dataKey="fatigue" fill="hsl(25,90%,55%)" radius={[4, 4, 0, 0]} name="Fatigue %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Work-Rest Cycle Optimizer ──

function WorkRestView({
  report,
  weeklyReport,
}: {
  report: DailyReport | null;
  weeklyReport: WeeklyReport | null;
}) {
  // Use weekly recommendation if available, else daily
  const workMin = weeklyReport?.recommendedWorkMin ?? report?.recommendedWorkMin ?? 25;
  const breakMin = weeklyReport?.recommendedBreakMin ?? report?.recommendedBreakMin ?? 5;
  const fatigueOnset = report?.fatigueOnsetMin ?? null;
  const focusPercent = report?.focusPercent ?? 0;

  const cyclesPerHour = 60 / (workMin + breakMin);
  const productiveMinPerHour = +(cyclesPerHour * workMin).toFixed(0);

  // Radial gauge data
  const gaugeData = [
    { name: "Work", value: workMin, fill: "hsl(187,72%,53%)" },
    { name: "Break", value: breakMin, fill: "hsl(25,90%,55%)" },
  ];

  return (
    <div className="space-y-4">
      {/* Main Recommendation Card */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold">Your Optimal Work-Rest Cycle</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Visual Cycle Representation */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 144 144" className="w-full h-full">
                {/* Background circle */}
                <circle cx="72" cy="72" r="60" fill="none" stroke="hsl(222,30%,18%)" strokeWidth="12" />
                {/* Work arc */}
                <circle
                  cx="72" cy="72" r="60"
                  fill="none"
                  stroke="hsl(187,72%,53%)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(workMin / (workMin + breakMin)) * 377} 377`}
                  transform="rotate(-90 72 72)"
                />
                {/* Break arc */}
                <circle
                  cx="72" cy="72" r="60"
                  fill="none"
                  stroke="hsl(25,90%,55%)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(breakMin / (workMin + breakMin)) * 377} 377`}
                  strokeDashoffset={`${-(workMin / (workMin + breakMin)) * 377}`}
                  transform="rotate(-90 72 72)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{workMin + breakMin}</span>
                <span className="text-[10px] text-muted-foreground">min cycle</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[hsl(187,72%,53%)]" />
                <span className="text-xs text-muted-foreground">{workMin} min work</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[hsl(25,90%,55%)]" />
                <span className="text-xs text-muted-foreground">{breakMin} min break</span>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="md:col-span-2 space-y-3">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Based on your fatigue patterns, we recommend a{" "}
                <span className="font-bold text-primary">{workMin}-minute work / {breakMin}-minute break</span>{" "}
                cycle. This is personalized to your observed fatigue onset timing and focus sustainability.
              </p>

              {fatigueOnset !== null && (
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    <Timer className="w-3 h-3 inline mr-1" />
                    Your fatigue typically sets in after <span className="font-bold text-foreground">{fatigueOnset.toFixed(0)} minutes</span>.
                    {fatigueOnset < 20 && " Consider shorter, more frequent focus sessions to maintain productivity."}
                    {fatigueOnset >= 20 && fatigueOnset < 30 && " This is a healthy focus window — the standard Pomodoro fits you well."}
                    {fatigueOnset >= 30 && " You have strong focus stamina. Take advantage with extended work blocks."}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-secondary/30 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Cycles / Hour</p>
                  <p className="text-lg font-bold text-foreground">{cyclesPerHour.toFixed(1)}</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Productive Min / Hr</p>
                  <p className="text-lg font-bold text-primary">{productiveMinPerHour}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-muted-foreground" />
          How This Is Calculated
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="rounded-lg bg-secondary/20 p-3">
            <p className="font-semibold text-foreground mb-1">1. Fatigue Onset</p>
            <p>We track the minute into each session when your fatigue first exceeds 40%. Earlier onset → shorter work blocks recommended.</p>
          </div>
          <div className="rounded-lg bg-secondary/20 p-3">
            <p className="font-semibold text-foreground mb-1">2. Focus Sustainability</p>
            <p>Your focus ratio (time focused vs total time) determines if you can sustain extended deep-work sessions (&gt;40 min).</p>
          </div>
          <div className="rounded-lg bg-secondary/20 p-3">
            <p className="font-semibold text-foreground mb-1">3. Weekly Adaptation</p>
            <p>When weekly data is available, cycle recommendations use the median fatigue onset across all sessions for stability.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tiny helper components
// ═══════════════════════════════════════════════════════════════════════════════

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function formatDateFull(dateKey: string): string {
  if (!dateKey || dateKey === "N/A") return dateKey;
  try {
    const [y, m, d] = dateKey.split("-").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const date = new Date(y, m - 1, d);
    return `${dayNames[date.getDay()]}, ${months[m - 1]} ${d}`;
  } catch {
    return dateKey;
  }
}

function formatDateShort(dateKey: string): string {
  if (!dateKey || dateKey === "N/A") return dateKey;
  try {
    const [, m, d] = dateKey.split("-").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[m - 1]} ${d}`;
  } catch {
    return dateKey;
  }
}
