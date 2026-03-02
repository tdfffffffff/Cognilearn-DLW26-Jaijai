/**
 * Shared topic store — single source of truth for subjects/topics.
 * Used by CognitiveFingerprint (folders), QuizMe (disciplines), and TeachMe.
 */

export interface TopicFolder {
  id: string;
  topic: string;
  mastery: number;
  errors: number;
  riskLevel: "excellent" | "good" | "moderate" | "risk" | "critical";
  icon: string;
  uploadedMaterials: UploadedMaterial[];
}

export interface UploadedMaterial {
  id: string;
  name: string;
  content: string;        // extracted text content
  uploadedAt: string;
  size: string;
}

// Default topics — the same ones used by CognitiveFingerprint
let _topics: TopicFolder[] = [
  { id: "linear-algebra", topic: "Linear Algebra", mastery: 82, errors: 5, riskLevel: "good", icon: "📐", uploadedMaterials: [] },
  { id: "calculus-ii", topic: "Calculus II", mastery: 45, errors: 18, riskLevel: "critical", icon: "∫", uploadedMaterials: [] },
  { id: "probability", topic: "Probability", mastery: 68, errors: 9, riskLevel: "moderate", icon: "🎲", uploadedMaterials: [] },
  { id: "statistics", topic: "Statistics", mastery: 73, errors: 7, riskLevel: "good", icon: "📊", uploadedMaterials: [] },
  { id: "discrete-math", topic: "Discrete Math", mastery: 55, errors: 14, riskLevel: "risk", icon: "🔢", uploadedMaterials: [] },
  { id: "differential-eq", topic: "Differential Eq.", mastery: 38, errors: 21, riskLevel: "critical", icon: "📈", uploadedMaterials: [] },
];

// Simple reactive store with listeners
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function getTopics(): TopicFolder[] {
  return _topics;
}

export function setTopics(topics: TopicFolder[]): void {
  _topics = topics;
  listeners.forEach((l) => l());
}

export function addMaterialToTopic(topicId: string, material: UploadedMaterial): void {
  _topics = _topics.map((t) =>
    t.id === topicId
      ? { ...t, uploadedMaterials: [...t.uploadedMaterials, material] }
      : t
  );
  listeners.forEach((l) => l());
}

export function removeMaterialFromTopic(topicId: string, materialId: string): void {
  _topics = _topics.map((t) =>
    t.id === topicId
      ? { ...t, uploadedMaterials: t.uploadedMaterials.filter((m) => m.id !== materialId) }
      : t
  );
  listeners.forEach((l) => l());
}

export function addTopic(topic: Partial<TopicFolder>): void {
  const newTopic: TopicFolder = {
    id: topic.id || `topic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    topic: topic.topic || "New Topic",
    mastery: topic.mastery ?? 0,
    errors: topic.errors ?? 0,
    riskLevel: topic.riskLevel || "moderate",
    icon: topic.icon || "📚",
    uploadedMaterials: topic.uploadedMaterials || [],
  };
  _topics = [..._topics, newTopic];
  listeners.forEach((l) => l());
}

export function removeTopic(topicId: string): void {
  _topics = _topics.filter((t) => t.id !== topicId);
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMaterialsForTopic(topicId: string): string {
  const topic = _topics.find((t) => t.id === topicId);
  if (!topic) return "";
  return topic.uploadedMaterials.map((m) => m.content).join("\n\n---\n\n");
}
