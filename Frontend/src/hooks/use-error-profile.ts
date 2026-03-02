import { useSyncExternalStore } from "react";
import {
  getErrorProfile,
  subscribeErrorProfile,
  type ErrorCategoryScore,
} from "@/data/errorProfileStore";

/**
 * React hook to subscribe to the shared error profile store.
 * Automatically re-renders when error scores change (e.g., after quiz assessment).
 */
export function useErrorProfile(): ErrorCategoryScore[] {
  return useSyncExternalStore(subscribeErrorProfile, getErrorProfile, getErrorProfile);
}
