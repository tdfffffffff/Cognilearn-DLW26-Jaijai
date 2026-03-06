import React, { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useWorkBreakCoach } from "@/context/WorkBreakCoachContext";
import type { FatiguePayload } from "@/lib/fatigueEngine";
import { fatigueAnalytics } from "@/lib/fatigueAnalyticsStore";

export interface FatigueHistoryPoint {
  elapsedSec: number;
  elapsedLabel: string;
  clockTime: string;
  ear: number;
  fatigue: number;
}

interface FatigueStreamContextValue {
  livePayload: FatiguePayload | null;
  history: FatigueHistoryPoint[];
  sessionStartTs: number | null;
  handleMonitorUpdate: (payload: FatiguePayload) => void;
  /** Whether the camera should be active (user-controlled toggle) */
  cameraEnabled: boolean;
  /** Set camera enabled/disabled — persists across page navigation */
  setCameraEnabled: (enabled: boolean) => void;
  /** Shared MediaStream for video preview on other pages */
  mediaStream: MediaStream | null;
  setMediaStream: (stream: MediaStream | null) => void;
  /** Whether a face is currently detected by the background monitor */
  faceDetected: boolean;
  setFaceDetected: (detected: boolean) => void;
  /** Whether the background monitor is initializing camera/FaceMesh */
  isMonitorInitializing: boolean;
  setIsMonitorInitializing: (v: boolean) => void;
  /** Whether camera permission was denied */
  permissionDenied: boolean;
  setPermissionDenied: (denied: boolean) => void;
}

const MAX_HISTORY = 7200;

function formatElapsed(sec: number): string {
  const totalSec = Math.max(0, Math.floor(sec));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

const FatigueStreamContext = createContext<FatigueStreamContextValue>({
  livePayload: null,
  history: [],
  sessionStartTs: null,
  handleMonitorUpdate: () => {},
  cameraEnabled: false,
  setCameraEnabled: () => {},
  mediaStream: null,
  setMediaStream: () => {},
  faceDetected: false,
  setFaceDetected: () => {},
  isMonitorInitializing: false,
  setIsMonitorInitializing: () => {},
  permissionDenied: false,
  setPermissionDenied: () => {},
});

export function FatigueStreamProvider({ children }: { children: ReactNode }) {
  const { handleFatigueUpdate } = useWorkBreakCoach();
  const [livePayload, setLivePayload] = useState<FatiguePayload | null>(null);
  const [history, setHistory] = useState<FatigueHistoryPoint[]>([]);
  const sessionStartRef = useRef<number | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isMonitorInitializing, setIsMonitorInitializing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleMonitorUpdate = useCallback(
    (payload: FatiguePayload) => {
      if (!sessionStartRef.current) {
        sessionStartRef.current = payload.ts;
      }

      setLivePayload(payload);
      handleFatigueUpdate(payload);

      // Record sample for long-term analytics (daily/weekly reports)
      if (payload.faceDetected) {
        fatigueAnalytics.recordSample(payload.fatigueScore, payload.ear);
      }

      const now = new Date();
      const clockTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      const elapsedSec = Math.max(
        0,
        Math.floor((payload.ts - (sessionStartRef.current ?? payload.ts)) / 1000),
      );

      setHistory((prev) => {
        const next = [
          ...prev,
          {
            elapsedSec,
            elapsedLabel: formatElapsed(elapsedSec),
            clockTime,
            ear: +payload.ear.toFixed(3),
            fatigue: +(payload.fatigueScore * 100).toFixed(1),
          },
        ];

        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
    },
    [handleFatigueUpdate],
  );

  return (
    <FatigueStreamContext.Provider
      value={{
        livePayload,
        history,
        sessionStartTs: sessionStartRef.current,
        handleMonitorUpdate,
        cameraEnabled,
        setCameraEnabled,
        mediaStream,
        setMediaStream,
        faceDetected,
        setFaceDetected,
        isMonitorInitializing,
        setIsMonitorInitializing,
        permissionDenied,
        setPermissionDenied,
      }}
    >
      {children}
    </FatigueStreamContext.Provider>
  );
}

export function useFatigueStream(): FatigueStreamContextValue {
  return useContext(FatigueStreamContext);
}
