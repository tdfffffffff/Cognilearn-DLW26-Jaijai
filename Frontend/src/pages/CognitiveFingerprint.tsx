import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import {
  ArrowDown, ArrowUp, TrendingDown, AlertTriangle, CheckCircle2,
  FolderOpen, FolderClosed, Upload, FileText, Trash2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { errorTypeRadar, shapExplanations, forgettingCurveData } from "@/data/mockData";
import { useTopics } from "@/hooks/use-topics";
import { useErrorProfile } from "@/hooks/use-error-profile";
import { addMaterialToTopic, removeMaterialFromTopic, type UploadedMaterial } from "@/data/topicStore";

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
  const topics = useTopics();
  const errorProfile = useErrorProfile();
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFolder = (topicId: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const handleFileUpload = async (topicId: string, files: FileList | null) => {
    if (!files) return;
    setUploadingFor(topicId);

    for (const file of Array.from(files)) {
      try {
        const text = await readFileAsText(file);
        const material: UploadedMaterial = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          content: text,
          uploadedAt: new Date().toISOString(),
          size: formatFileSize(file.size),
        };
        addMaterialToTopic(topicId, material);
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    }
    setUploadingFor(null);
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
            <RadarChart data={errorProfile}>
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

        {/* Topic Breakdown — Expandable Folders */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Topic Breakdown</h2>
          <div className="space-y-2">
            {topics.map((topic) => {
              const isOpen = openFolders.has(topic.id);
              return (
                <div key={topic.id} className="rounded-lg border overflow-hidden">
                  {/* Folder Header — always visible with mastery bar */}
                  <button
                    onClick={() => toggleFolder(topic.id)}
                    className={`w-full text-left p-3 transition-colors ${riskBg[topic.riskLevel]} hover:opacity-90`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <FolderOpen className="w-4 h-4 text-primary" />
                        ) : (
                          <FolderClosed className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {topic.icon} {topic.topic}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono uppercase ${riskColors[topic.riskLevel]}`}>
                          {topic.riskLevel}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                    {/* Mastery bar — always visible */}
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
                  </button>

                  {/* Expanded Folder Content — Upload & Materials */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border bg-card/50"
                      >
                        <div className="p-4 space-y-3">
                          {/* Upload Button */}
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              ref={fileInputRef}
                              className="hidden"
                              accept=".txt,.md,.pdf,.doc,.docx,.csv"
                              multiple
                              onChange={(e) => handleFileUpload(topic.id, e.target.files)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 text-xs"
                              disabled={uploadingFor === topic.id}
                              onClick={() => {
                                fileInputRef.current?.click();
                                // Set up a one-time handler for this topic
                                if (fileInputRef.current) {
                                  fileInputRef.current.onchange = (e) => {
                                    const input = e.target as HTMLInputElement;
                                    handleFileUpload(topic.id, input.files);
                                    input.value = "";
                                  };
                                }
                              }}
                            >
                              <Upload className="w-3 h-3" />
                              {uploadingFor === topic.id ? "Uploading..." : "Upload Study Material"}
                            </Button>
                            <span className="text-[10px] text-muted-foreground">
                              .txt, .md, .csv supported
                            </span>
                          </div>

                          {/* Uploaded Materials List */}
                          {topic.uploadedMaterials.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                Uploaded Materials ({topic.uploadedMaterials.length})
                              </p>
                              {topic.uploadedMaterials.map((mat) => (
                                <div
                                  key={mat.id}
                                  className="flex items-center gap-3 p-2 rounded-md bg-secondary/20 border border-border/30"
                                >
                                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">{mat.name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {mat.size} · {new Date(mat.uploadedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeMaterialFromTopic(topic.id, mat.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              No materials uploaded yet. Upload study notes to generate personalized quizzes.
                            </p>
                          )}
                          {topic.uploadedMaterials.length > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                              Quiz generation available from {topic.uploadedMaterials.length} source{topic.uploadedMaterials.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
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
