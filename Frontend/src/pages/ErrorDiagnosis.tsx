import { useState, useRef, useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Camera,
  ClipboardPaste,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  Lightbulb,
  Clock,
  ImageIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { analyzeTestPaper, type DiagnosisResult, type ErrorCategoryScore } from "@/lib/api";
import {
  addDiagnosisEntry,
  removeDiagnosisEntry,
  subscribeDiagnosis,
  getDiagnosisSnapshot,
  getAggregateProfile,
  type DiagnosisEntry,
} from "@/data/diagnosisStore";
import { getTopics } from "@/data/topicStore";
import LatexRenderer from "@/components/LatexRenderer";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resize an image to a thumbnail for localStorage storage */
function createThumbnail(base64: string, maxW = 200): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const categoryColors: Record<string, string> = {
  Conceptual: "#8b5cf6",
  Procedural: "#3b82f6",
  Factual: "#10b981",
  Metacognitive: "#f59e0b",
  Transfer: "#ef4444",
  Application: "#ec4899",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ErrorProfileRadar({ data, title }: { data: ErrorCategoryScore[]; title?: string }) {
  const chartData = data.map((d) => ({
    category: d.type,
    score: d.score,
    fullMark: 100,
  }));

  return (
    <div>
      {title && <p className="text-xs font-medium text-muted-foreground mb-1 text-center">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
          <Radar
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.25}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function QuestionCard({
  q,
  index,
}: {
  q: DiagnosisResult["questions_found"][0];
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-lg p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {q.is_correct ? (
            <CheckCircle2 className="w-5 h-5 text-cognitive-excellent flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-cognitive-critical flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Question {index + 1}</p>
            <div className="text-xs text-muted-foreground line-clamp-2">
              <LatexRenderer text={q.question_text} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant={q.is_correct ? "default" : "destructive"}
            className="text-xs"
          >
            {q.score}/100
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 p-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase text-muted-foreground">Student's Answer</p>
                <div className="text-sm text-foreground bg-background/50 rounded p-2">
                  <LatexRenderer text={q.student_answer} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase text-muted-foreground">Correct Answer</p>
                <div className="text-sm text-cognitive-excellent bg-background/50 rounded p-2">
                  <LatexRenderer text={q.correct_answer} />
                </div>
              </div>
            </div>

            {q.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase text-muted-foreground">Errors Found</p>
                {q.errors.map((err, i) => (
                  <div key={i} className="bg-destructive/10 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        style={{ borderColor: categoryColors[err.category] || "#888", color: categoryColors[err.category] || "#888" }}
                        className="text-[10px]"
                      >
                        {err.category}
                      </Badge>
                    </div>
                    <div className="text-xs text-foreground">
                      <LatexRenderer text={err.description} />
                    </div>
                    <div className="text-xs text-cognitive-excellent">
                      <span className="font-medium">Correction: </span>
                      <LatexRenderer text={err.correction} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <ErrorProfileRadar data={q.error_classifications} title="Question Error Profile" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HistoryCard({
  entry,
  onDelete,
  onView,
}: {
  entry: DiagnosisEntry;
  onDelete: (id: string) => void;
  onView: (entry: DiagnosisEntry) => void;
}) {
  const topics = getTopics();
  const topicLabel = topics.find((t) => t.id === entry.topic)?.topic || entry.topic;
  const wrongCount = entry.result.questions_found.filter((q) => !q.is_correct).length;
  const totalCount = entry.result.questions_found.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-lg p-3 cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={() => onView(entry)}
    >
      <div className="flex items-center gap-3">
        {entry.imageThumbnail ? (
          <img
            src={entry.imageThumbnail}
            alt="Upload"
            className="w-12 h-12 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{topicLabel}</p>
          <p className="text-xs text-muted-foreground">
            {wrongCount}/{totalCount} wrong • {new Date(entry.timestamp).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(entry.id);
          }}
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const ErrorDiagnosis = () => {
  const topics = getTopics();
  const [selectedTopic, setSelectedTopic] = useState(topics[0]?.id || "");
  const [additionalContext, setAdditionalContext] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingEntry, setViewingEntry] = useState<DiagnosisEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Reactive history from store
  const history = useSyncExternalStore(subscribeDiagnosis, getDiagnosisSnapshot);
  const aggregateProfile = getAggregateProfile(selectedTopic);

  // ─── Image handling ──────────────────────────────────────────────────

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const b64 = await fileToBase64(file);
    setImageBase64(b64);
    setImagePreview(`data:${file.type};base64,${b64}`);
    setResult(null);
    setError(null);
    setViewingEntry(null);
  }, []);

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFileUpload(file);
          return;
        }
      }
    },
    [handleFileUpload],
  );

  // Listen for paste events
  useState(() => {
    document.addEventListener("paste", handlePaste as EventListener);
    return () => document.removeEventListener("paste", handlePaste as EventListener);
  });

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      setError("Could not access camera. Please check permissions.");
    }
  }, []);

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const b64 = dataUrl.split(",")[1];
    setImageBase64(b64);
    setImagePreview(dataUrl);
    setResult(null);
    setError(null);
    setViewingEntry(null);
    // Stop camera
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const clearImage = useCallback(() => {
    setImageBase64(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setViewingEntry(null);
  }, []);

  // ─── Analysis ────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!imageBase64 || !selectedTopic) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await analyzeTestPaper(
        imageBase64,
        selectedTopic,
        additionalContext || undefined,
      );
      setResult(res);
      // Save to history
      const thumb = await createThumbnail(imageBase64);
      addDiagnosisEntry({
        topic: selectedTopic,
        imageThumbnail: thumb,
        result: res,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [imageBase64, selectedTopic, additionalContext]);

  const handleViewEntry = useCallback((entry: DiagnosisEntry) => {
    setViewingEntry(entry);
    setResult(entry.result);
    setImagePreview(entry.imageThumbnail);
    setImageBase64(null); // No re-analysis from history view
    setError(null);
  }, []);

  // ─── Active display result ──────────────────────────────────────────

  const displayResult = viewingEntry ? viewingEntry.result : result;

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          Error Diagnosis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload test papers or wrong questions — AI analyzes your errors and builds your cognitive profile
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column: Upload & Controls ───────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Topic + Context */}
          <Card className="glass border-border">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Subject / Topic</label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.icon} {t.topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Additional Context <span className="text-muted-foreground/60">(optional)</span>
                  </label>
                  <Textarea
                    placeholder="e.g. 'Chapter 5 midterm', 'Integration by parts problems'…"
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    className="h-9 min-h-[36px] resize-none text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Area */}
          <Card className="glass border-border">
            <CardContent className="p-4">
              {cameraOpen ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg max-h-80 object-contain bg-black"
                  />
                  <div className="flex gap-2 justify-center">
                    <Button onClick={captureFromCamera} className="gap-2">
                      <Camera className="w-4 h-4" /> Capture
                    </Button>
                    <Button variant="outline" onClick={closeCamera}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Uploaded test paper"
                    className="w-full rounded-lg max-h-96 object-contain bg-black/5"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-7 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={clearImage}
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileUpload(file);
                  }}
                >
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Drop an image here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports photos of test papers, homework, or screenshots of wrong questions
                  </p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="w-3.5 h-3.5" /> Browse Files
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCamera();
                      }}
                    >
                      <Camera className="w-3.5 h-3.5" /> Camera
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" /> Paste (Ctrl+V)
                    </Button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = "";
                }}
              />
            </CardContent>
          </Card>

          {/* Analyze Button */}
          {imageBase64 && !viewingEntry && (
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={analyzing}
              onClick={handleAnalyze}
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI…
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" /> Analyze Errors
                </>
              )}
            </Button>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ─── Results ──────────────────────────────────────────── */}
          <AnimatePresence>
            {displayResult && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="glass border-border">
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">Questions</p>
                      <p className="text-2xl font-bold text-foreground">
                        {displayResult.questions_found.length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-border">
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">Correct</p>
                      <p className="text-2xl font-bold text-cognitive-excellent">
                        {displayResult.questions_found.filter((q) => q.is_correct).length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-border">
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">Wrong</p>
                      <p className="text-2xl font-bold text-cognitive-critical">
                        {displayResult.questions_found.filter((q) => !q.is_correct).length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-border">
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">Avg Score</p>
                      <p className="text-2xl font-bold text-foreground">
                        {displayResult.questions_found.length > 0
                          ? Math.round(
                              displayResult.questions_found.reduce((s, q) => s + q.score, 0) /
                                displayResult.questions_found.length,
                            )
                          : 0}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Aggregate Radar + Feedback */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="glass border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        Cognitive Error Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ErrorProfileRadar data={displayResult.aggregate_error_profile} />
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {displayResult.aggregate_error_profile.map((cat) => (
                          <div key={cat.type} className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: categoryColors[cat.type] || "#888" }}
                            />
                            <span className="text-xs text-muted-foreground">{cat.type}</span>
                            <span className="text-xs font-medium text-foreground ml-auto">{cat.score}%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <Card className="glass border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          Overall Feedback
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-sm text-foreground leading-relaxed">
                          <LatexRenderer text={displayResult.overall_feedback} />
                        </div>
                      </CardContent>
                    </Card>

                    {displayResult.study_recommendations.length > 0 && (
                      <Card className="glass border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                            Study Recommendations
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <ul className="space-y-1.5">
                            {displayResult.study_recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                                <LatexRenderer text={rec} />
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Per-question breakdown */}
                <Card className="glass border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Question-by-Question Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    {displayResult.questions_found.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No questions were identified in the image. Try uploading a clearer photo.
                      </p>
                    ) : (
                      displayResult.questions_found.map((q, i) => (
                        <QuestionCard key={i} q={q} index={i} />
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Right Column: History + Aggregate ────────────────────── */}
        <div className="space-y-4">
          {/* Cumulative Profile */}
          <Card className="glass border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Cumulative Profile
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Averaged across all diagnoses for {topics.find((t) => t.id === selectedTopic)?.topic || "this topic"}
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ErrorProfileRadar data={aggregateProfile} />
            </CardContent>
          </Card>

          {/* History */}
          <Card className="glass border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Diagnosis History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No diagnoses yet. Upload a test paper to get started.
                </p>
              ) : (
                history.map((entry) => (
                  <HistoryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={removeDiagnosisEntry}
                    onView={handleViewEntry}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ErrorDiagnosis;
