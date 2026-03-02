import { useSyncExternalStore } from "react";
import { getTopics, subscribe, type TopicFolder } from "@/data/topicStore";

/**
 * React hook to subscribe to the shared topic store.
 * Automatically re-renders when topics change.
 */
export function useTopics(): TopicFolder[] {
  return useSyncExternalStore(subscribe, getTopics, getTopics);
}
