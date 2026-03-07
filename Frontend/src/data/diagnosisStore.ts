/**
 * Persistent store for Error Diagnosis history.
 * Stores uploaded test paper analyses in localStorage with reactive listeners.
 */

import type { DiagnosisResult, ErrorCategoryScore } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiagnosisEntry {
  id: string;
  timestamp: number;
  topic: string;
  /** Base64 thumbnail of the uploaded image (resized for storage) */
  imageThumbnail: string;
  /** Full analysis result from the API */
  result: DiagnosisResult;
}

// ─── Storage key ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "cognilearn_diagnosis_history";

// ─── Internal state ──────────────────────────────────────────────────────────

let entries: DiagnosisEntry[] = [];
const listeners = new Set<() => void>();

function load(): DiagnosisEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt data */ }
  return [];
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function notify() {
  listeners.forEach((l) => l());
}

// Initialise from localStorage on module load
entries = load();

// ─── Public API ──────────────────────────────────────────────────────────────

export function getDiagnosisEntries(): DiagnosisEntry[] {
  return entries;
}

export function addDiagnosisEntry(entry: Omit<DiagnosisEntry, "id" | "timestamp">): DiagnosisEntry {
  const newEntry: DiagnosisEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  entries = [newEntry, ...entries];
  persist();
  notify();
  return newEntry;
}

export function removeDiagnosisEntry(id: string) {
  entries = entries.filter((e) => e.id !== id);
  persist();
  notify();
}

export function clearDiagnosisHistory() {
  entries = [];
  persist();
  notify();
}

/**
 * Get aggregate error profile across ALL stored diagnoses for a given topic,
 * or across all topics if none specified.
 */
export function getAggregateProfile(topicFilter?: string): ErrorCategoryScore[] {
  const filtered = topicFilter
    ? entries.filter((e) => e.topic === topicFilter)
    : entries;

  if (filtered.length === 0) {
    return [
      { type: "Conceptual", score: 50 },
      { type: "Procedural", score: 50 },
      { type: "Factual", score: 50 },
      { type: "Metacognitive", score: 50 },
      { type: "Transfer", score: 50 },
      { type: "Application", score: 50 },
    ];
  }

  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const entry of filtered) {
    for (const cat of entry.result.aggregate_error_profile) {
      sums[cat.type] = (sums[cat.type] || 0) + cat.score;
      counts[cat.type] = (counts[cat.type] || 0) + 1;
    }
  }

  const categories = ["Conceptual", "Procedural", "Factual", "Metacognitive", "Transfer", "Application"] as const;
  return categories.map((type) => ({
    type,
    score: Math.round((sums[type] || 0) / (counts[type] || 1)),
  }));
}

// ─── Reactive subscription (useSyncExternalStore compatible) ────────────────

export function subscribeDiagnosis(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDiagnosisSnapshot(): DiagnosisEntry[] {
  return entries;
}
