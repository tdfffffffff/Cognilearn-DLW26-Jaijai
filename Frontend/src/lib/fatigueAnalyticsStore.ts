/**
 * fatigueAnalyticsStore — persistent on-device fatigue analytics.
 *
 * Stores per-session records in localStorage, keyed by date.
 * Provides:
 *  - Daily report  (focus time, avg fatigue, time-of-day heatmap, work-rest recommendation)
 *  - Weekly report  (day-over-day trend like iOS Screen Time: Δ focus, Δ fatigue)
 *  - Time-of-day insight (morning / afternoon / evening / night fatigue comparison)
 *  - Adaptive work-rest cycle recommendation
 *
 * All data stays on-device — nothing is uploaded.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/** A single data point sampled every ~30 s while camera is active */
export interface FatigueSample {
  /** Unix ms */
  ts: number;
  /** Hour of day 0-23 */
  hour: number;
  /** Fatigue score 0-1 */
  fatigue: number;
  /** EAR value */
  ear: number;
  /** Was the user focused? (fatigue < 0.4) */
  focused: boolean;
}

/** Aggregated stats for one time-of-day bucket */
export interface TimeOfDayBucket {
  label: string;           // "Morning" | "Afternoon" | "Evening" | "Night"
  range: string;           // "6 AM – 12 PM"
  avgFatigue: number;      // 0-100
  avgFocusPercent: number; // 0-100
  totalMinutes: number;    // how many minutes of data in this bucket
  sampleCount: number;
}

/** A single day's aggregated report */
export interface DailyReport {
  date: string;                         // YYYY-MM-DD
  totalFocusMin: number;                // total time fatigue < 40%
  totalSessionMin: number;              // total tracked time
  avgFatigue: number;                   // 0-100
  peakFatigue: number;                  // 0-100
  peakFatigueTime: string;             // HH:MM
  fatigueOnsetMin: number | null;       // minutes in before fatigue first hit 40%+ (null = never)
  timeOfDay: TimeOfDayBucket[];         // 4 buckets
  bestPeriod: string;                   // "Morning" / "Afternoon" / etc.
  worstPeriod: string;
  recommendedWorkMin: number;           // adaptive Pomodoro
  recommendedBreakMin: number;
  sessions: number;                     // number of camera sessions
  focusPercent: number;                 // 0-100
  hourlyFatigue: { hour: number; avg: number; sampleCount: number }[];
}

/** Weekly comparison (like iOS Screen Time) */
export interface WeeklyReport {
  weekLabel: string;                    // "Feb 24 – Mar 2"
  days: DailyReport[];
  avgDailyFocusMin: number;
  avgDailyFatigue: number;
  totalFocusMin: number;
  totalSessionMin: number;
  bestDay: string;                      // date with highest focus%
  worstDay: string;
  focusTrend: number;                   // Δ% vs previous week (+12.3 means 12.3% more focus)
  fatigueTrend: number;                 // Δ avg fatigue vs previous week
  bestPeriodOverall: string;
  recommendedWorkMin: number;
  recommendedBreakMin: number;
  hasEnoughData: boolean;               // true if ≥2 days of data in the week
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "fatigue_analytics_v1";
const MAX_DAYS = 60; // keep up to 60 days of data

/** Time-of-day buckets */
const TIME_BUCKETS = [
  { label: "Morning",   range: "6 AM – 12 PM",  startHour: 6,  endHour: 12 },
  { label: "Afternoon", range: "12 PM – 5 PM",   startHour: 12, endHour: 17 },
  { label: "Evening",   range: "5 PM – 9 PM",    startHour: 17, endHour: 21 },
  { label: "Night",     range: "9 PM – 6 AM",    startHour: 21, endHour: 6 },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Stored data shape
// ═══════════════════════════════════════════════════════════════════════════════

interface StoredDayData {
  date: string;
  samples: FatigueSample[];
}

interface StoredAnalytics {
  days: StoredDayData[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Persistence helpers
// ═══════════════════════════════════════════════════════════════════════════════

function loadStore(): StoredAnalytics {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredAnalytics;
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { days: [] };
}

function saveStore(store: StoredAnalytics): void {
  try {
    // Prune old days
    if (store.days.length > MAX_DAYS) {
      store.days = store.days.slice(-MAX_DAYS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota errors */
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Core Store Class
// ═══════════════════════════════════════════════════════════════════════════════

export class FatigueAnalyticsStore {
  private store: StoredAnalytics;
  private lastSampleTs = 0;

  constructor() {
    this.store = loadStore();
  }

  // ── Recording ──

  /** Record a fatigue sample. Call this every ~2-5s from the fatigue stream.
   *  Internally subsamples to ~30s intervals to keep storage small. */
  recordSample(fatigueScore: number, ear: number): void {
    const now = Date.now();
    // Subsample: only record one sample every 30 seconds
    if (now - this.lastSampleTs < 30_000) return;
    this.lastSampleTs = now;

    const date = new Date(now);
    const dateKey = toDateKey(date);
    const hour = date.getHours();

    const sample: FatigueSample = {
      ts: now,
      hour,
      fatigue: fatigueScore,
      ear,
      focused: fatigueScore < 0.4,
    };

    let dayData = this.store.days.find((d) => d.date === dateKey);
    if (!dayData) {
      dayData = { date: dateKey, samples: [] };
      this.store.days.push(dayData);
    }
    dayData.samples.push(sample);
    saveStore(this.store);
  }

  // ── Queries ──

  /** Get the daily report for a specific date (defaults to today) */
  getDailyReport(dateKey?: string): DailyReport | null {
    const key = dateKey ?? toDateKey(new Date());
    const dayData = this.store.days.find((d) => d.date === key);
    if (!dayData || dayData.samples.length < 2) return null;
    return buildDailyReport(dayData);
  }

  /** Get today's daily report */
  getTodayReport(): DailyReport | null {
    return this.getDailyReport(toDateKey(new Date()));
  }

  /** Get all available daily reports (most recent first) */
  getAllDailyReports(): DailyReport[] {
    return this.store.days
      .filter((d) => d.samples.length >= 2)
      .map(buildDailyReport)
      .reverse();
  }

  /** Get the weekly report for the current week */
  getCurrentWeeklyReport(): WeeklyReport | null {
    const today = new Date();
    return this.getWeeklyReport(today);
  }

  /** Get a weekly report ending on a given date */
  getWeeklyReport(endDate: Date): WeeklyReport | null {
    const weekDays = getLast7Days(endDate);
    const reports = weekDays
      .map((d) => this.getDailyReport(d))
      .filter((r): r is DailyReport => r !== null);

    if (reports.length === 0) return null;

    // Previous week for Δ comparison
    const prevEnd = new Date(endDate);
    prevEnd.setDate(prevEnd.getDate() - 7);
    const prevWeekDays = getLast7Days(prevEnd);
    const prevReports = prevWeekDays
      .map((d) => this.getDailyReport(d))
      .filter((r): r is DailyReport => r !== null);

    return buildWeeklyReport(reports, prevReports, weekDays);
  }

  /** Get all available dates with data */
  getAvailableDates(): string[] {
    return this.store.days
      .filter((d) => d.samples.length >= 2)
      .map((d) => d.date)
      .reverse();
  }

  /** Number of days with data */
  get totalDaysTracked(): number {
    return this.store.days.filter((d) => d.samples.length >= 2).length;
  }

  /** Clear all stored data */
  clearAll(): void {
    this.store = { days: [] };
    saveStore(this.store);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Report Builders
// ═══════════════════════════════════════════════════════════════════════════════

function buildDailyReport(dayData: StoredDayData): DailyReport {
  const { samples, date } = dayData;

  // Total session time (from first to last sample, approx 30s per gap)
  const totalSessionMin = samples.length > 1
    ? (samples[samples.length - 1].ts - samples[0].ts) / 60_000
    : 0;

  // Focus minutes (samples where focused = true, ~30s each)
  const focusedSamples = samples.filter((s) => s.focused);
  const totalFocusMin = (focusedSamples.length / samples.length) * totalSessionMin;

  // Average fatigue
  const avgFatigue = (samples.reduce((sum, s) => sum + s.fatigue, 0) / samples.length) * 100;

  // Peak fatigue
  const peakSample = samples.reduce((max, s) => (s.fatigue > max.fatigue ? s : max));
  const peakFatigue = peakSample.fatigue * 100;
  const peakDate = new Date(peakSample.ts);
  const peakFatigueTime = `${peakDate.getHours().toString().padStart(2, "0")}:${peakDate.getMinutes().toString().padStart(2, "0")}`;

  // Fatigue onset: first time fatigue exceeded 40%
  let fatigueOnsetMin: number | null = null;
  for (const s of samples) {
    if (s.fatigue >= 0.4) {
      fatigueOnsetMin = (s.ts - samples[0].ts) / 60_000;
      break;
    }
  }

  // Time-of-day buckets
  const timeOfDay = buildTimeOfDayBuckets(samples);

  // Best / worst period
  const bucketsWithData = timeOfDay.filter((b) => b.sampleCount > 0);
  const bestBucket = bucketsWithData.length > 0
    ? bucketsWithData.reduce((best, b) => (b.avgFocusPercent > best.avgFocusPercent ? b : best))
    : null;
  const worstBucket = bucketsWithData.length > 0
    ? bucketsWithData.reduce((worst, b) => (b.avgFocusPercent < worst.avgFocusPercent ? b : worst))
    : null;

  // Hourly fatigue breakdown
  const hourlyMap = new Map<number, { sum: number; count: number }>();
  for (const s of samples) {
    const entry = hourlyMap.get(s.hour) ?? { sum: 0, count: 0 };
    entry.sum += s.fatigue * 100;
    entry.count += 1;
    hourlyMap.set(s.hour, entry);
  }
  const hourlyFatigue = Array.from(hourlyMap.entries())
    .map(([hour, { sum, count }]) => ({ hour, avg: sum / count, sampleCount: count }))
    .sort((a, b) => a.hour - b.hour);

  // Adaptive work-rest recommendation based on fatigue onset
  const { workMin, breakMin } = computeAdaptiveWorkRest(fatigueOnsetMin, totalFocusMin / Math.max(1, totalSessionMin));

  // Session count (gap > 10 min = new session)
  let sessions = 1;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].ts - samples[i - 1].ts > 10 * 60_000) sessions++;
  }

  const focusPercent = totalSessionMin > 0 ? (totalFocusMin / totalSessionMin) * 100 : 0;

  return {
    date,
    totalFocusMin: +totalFocusMin.toFixed(1),
    totalSessionMin: +totalSessionMin.toFixed(1),
    avgFatigue: +avgFatigue.toFixed(1),
    peakFatigue: +peakFatigue.toFixed(1),
    peakFatigueTime,
    fatigueOnsetMin: fatigueOnsetMin !== null ? +fatigueOnsetMin.toFixed(1) : null,
    timeOfDay,
    bestPeriod: bestBucket?.label ?? "N/A",
    worstPeriod: worstBucket?.label ?? "N/A",
    recommendedWorkMin: workMin,
    recommendedBreakMin: breakMin,
    sessions,
    focusPercent: +focusPercent.toFixed(1),
    hourlyFatigue,
  };
}

function buildTimeOfDayBuckets(samples: FatigueSample[]): TimeOfDayBucket[] {
  return TIME_BUCKETS.map((bucket) => {
    const inBucket = samples.filter((s) => {
      if (bucket.label === "Night") {
        return s.hour >= 21 || s.hour < 6;
      }
      return s.hour >= bucket.startHour && s.hour < bucket.endHour;
    });

    if (inBucket.length === 0) {
      return {
        label: bucket.label,
        range: bucket.range,
        avgFatigue: 0,
        avgFocusPercent: 0,
        totalMinutes: 0,
        sampleCount: 0,
      };
    }

    const avgFatigue = (inBucket.reduce((s, x) => s + x.fatigue, 0) / inBucket.length) * 100;
    const focusedCount = inBucket.filter((s) => s.focused).length;
    const avgFocusPercent = (focusedCount / inBucket.length) * 100;
    const totalMinutes = (inBucket.length * 30) / 60; // ~30s per sample

    return {
      label: bucket.label,
      range: bucket.range,
      avgFatigue: +avgFatigue.toFixed(1),
      avgFocusPercent: +avgFocusPercent.toFixed(1),
      totalMinutes: +totalMinutes.toFixed(1),
      sampleCount: inBucket.length,
    };
  });
}

function computeAdaptiveWorkRest(
  fatigueOnsetMin: number | null,
  focusRatio: number,
): { workMin: number; breakMin: number } {
  // If user sustains high focus for the whole session
  if (focusRatio > 0.8 && (fatigueOnsetMin === null || fatigueOnsetMin > 40)) {
    return { workMin: 45, breakMin: 10 };
  }
  if (fatigueOnsetMin === null || fatigueOnsetMin > 25) {
    return { workMin: 25, breakMin: 5 };
  }
  if (fatigueOnsetMin > 15) {
    return { workMin: 20, breakMin: 5 };
  }
  return { workMin: 15, breakMin: 5 };
}

function buildWeeklyReport(
  reports: DailyReport[],
  prevReports: DailyReport[],
  weekDays: string[],
): WeeklyReport {
  const totalFocusMin = reports.reduce((s, r) => s + r.totalFocusMin, 0);
  const totalSessionMin = reports.reduce((s, r) => s + r.totalSessionMin, 0);
  const avgDailyFocusMin = reports.length > 0 ? totalFocusMin / reports.length : 0;
  const avgDailyFatigue = reports.length > 0
    ? reports.reduce((s, r) => s + r.avgFatigue, 0) / reports.length
    : 0;

  // Best and worst day
  const bestDay = reports.length > 0
    ? reports.reduce((best, r) => (r.focusPercent > best.focusPercent ? r : best))
    : null;
  const worstDay = reports.length > 0
    ? reports.reduce((worst, r) => (r.focusPercent < worst.focusPercent ? r : worst))
    : null;

  // Trend vs previous week
  let focusTrend = 0;
  let fatigueTrend = 0;
  if (prevReports.length > 0) {
    const prevAvgFocus = prevReports.reduce((s, r) => s + r.totalFocusMin, 0) / prevReports.length;
    const prevAvgFatigue = prevReports.reduce((s, r) => s + r.avgFatigue, 0) / prevReports.length;
    if (prevAvgFocus > 0) {
      focusTrend = ((avgDailyFocusMin - prevAvgFocus) / prevAvgFocus) * 100;
    }
    fatigueTrend = avgDailyFatigue - prevAvgFatigue;
  }

  // Best period overall
  const periodScores = new Map<string, { totalFocus: number; count: number }>();
  for (const r of reports) {
    for (const b of r.timeOfDay) {
      if (b.sampleCount === 0) continue;
      const entry = periodScores.get(b.label) ?? { totalFocus: 0, count: 0 };
      entry.totalFocus += b.avgFocusPercent;
      entry.count += 1;
      periodScores.set(b.label, entry);
    }
  }
  let bestPeriodOverall = "N/A";
  let bestPeriodScore = -1;
  for (const [label, { totalFocus, count }] of periodScores) {
    const avg = totalFocus / count;
    if (avg > bestPeriodScore) {
      bestPeriodScore = avg;
      bestPeriodOverall = label;
    }
  }

  // Adaptive work-rest based on weekly data
  const avgOnset = reports
    .filter((r) => r.fatigueOnsetMin !== null)
    .map((r) => r.fatigueOnsetMin!);
  const medianOnset = avgOnset.length > 0
    ? avgOnset.sort((a, b) => a - b)[Math.floor(avgOnset.length / 2)]
    : null;
  const avgFocusRatio = totalSessionMin > 0 ? totalFocusMin / totalSessionMin : 0;
  const { workMin, breakMin } = computeAdaptiveWorkRest(medianOnset, avgFocusRatio);

  // Week label
  const start = weekDays[0];
  const end = weekDays[weekDays.length - 1];
  const weekLabel = `${formatDateShort(start)} – ${formatDateShort(end)}`;

  return {
    weekLabel,
    days: reports,
    avgDailyFocusMin: +avgDailyFocusMin.toFixed(1),
    avgDailyFatigue: +avgDailyFatigue.toFixed(1),
    totalFocusMin: +totalFocusMin.toFixed(1),
    totalSessionMin: +totalSessionMin.toFixed(1),
    bestDay: bestDay?.date ?? "N/A",
    worstDay: worstDay?.date ?? "N/A",
    focusTrend: +focusTrend.toFixed(1),
    fatigueTrend: +fatigueTrend.toFixed(1),
    bestPeriodOverall,
    recommendedWorkMin: workMin,
    recommendedBreakMin: breakMin,
    hasEnoughData: reports.length >= 2,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility helpers
// ═══════════════════════════════════════════════════════════════════════════════

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getLast7Days(endDate: Date): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    days.push(toDateKey(d));
  }
  return days;
}

function formatDateShort(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton instance
// ═══════════════════════════════════════════════════════════════════════════════

export const fatigueAnalytics = new FatigueAnalyticsStore();
