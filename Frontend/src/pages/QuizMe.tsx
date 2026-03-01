import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic, MicOff, RotateCcw, ChevronRight, ChevronLeft, CheckCircle2, XCircle,
  Lightbulb, Eye, EyeOff, BarChart3, AlertTriangle, BookOpen, Trophy
} from "lucide-react";
import {
  quizQuestions, sampleErrorReport, disciplineConfig,
  type QuizQuestion, type Discipline, type QuizFormat, type ErrorClassification
} from "@/data/quizData";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";

type QuizState = "select" | "quiz" | "review" | "report";

interface UserAnswer {
  questionId: string;
  textAnswer: string;
  audioBlob?: Blob;
  isCorrect?: boolean;
  errorTypes: string[];
  timeSpent: number;
}

const severityColor = (s: string) =>
  s === "high" ? "text-cognitive-critical" : s === "medium" ? "text-cognitive-risk" : "text-cognitive-good";

const diffBadgeVariant = (d: string) =>
  d === "hard" ? "destructive" : d === "medium" ? "secondary" : "outline";

export default function QuizMe() {
  const [quizState, setQuizState] = useState<QuizState>("select");
  const [selectedDisciplines, setSelectedDisciplines] = useState<Discipline[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const filteredQuestions = quizQuestions.filter(
    (q) => selectedDisciplines.length === 0 || selectedDisciplines.includes(q.discipline)
  );
  const currentQuestion = filteredQuestions[currentIndex];
  const progress = filteredQuestions.length > 0 ? ((currentIndex + 1) / filteredQuestions.length) * 100 : 0;

  const toggleDiscipline = (d: Discipline) => {
    setSelectedDisciplines((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const startQuiz = () => {
    setCurrentIndex(0);
    setAnswers([]);
    setQuizState("quiz");
    setStartTime(Date.now());
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const submitAnswer = (selfMarked?: boolean) => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const newAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      textAnswer,
      isCorrect: selfMarked,
      errorTypes: selfMarked === false ? [currentQuestion.commonErrors[0] || "Conceptual"] : [],
      timeSpent,
    };
    setAnswers((prev) => [...prev, newAnswer]);

    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
      resetQuestionState();
    } else {
      setQuizState("report");
    }
  };

  const resetQuestionState = () => {
    setTextAnswer("");
    setShowAnswer(false);
    setShowHint(false);
    setAudioURL(null);
    setFlipped(false);
    setStartTime(Date.now());
  };

  // ── SELECT SCREEN ──
  if (quizState === "select") {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">Quiz Me</h1>
          <p className="text-muted-foreground">
            Adaptive quizzing with discipline-specific formats. Select topics to begin.
          </p>
        </div>

        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Choose Disciplines</CardTitle>
            <CardDescription>Each discipline uses the most effective question format</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.entries(disciplineConfig) as [Discipline, typeof disciplineConfig.math][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => toggleDiscipline(key)}
                  className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                    selectedDisciplines.includes(key)
                      ? "border-primary bg-primary/10 glow-primary"
                      : "border-border/50 bg-card/50 hover:border-primary/40"
                  }`}
                >
                  <div className="text-2xl mb-2">{cfg.icon}</div>
                  <div className="font-medium text-sm text-foreground">{cfg.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{cfg.formatLabel}</div>
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    {quizQuestions.filter((q) => q.discipline === key).length} questions
                  </Badge>
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredQuestions.length} question{filteredQuestions.length !== 1 ? "s" : ""} selected
              </p>
              <Button onClick={startQuiz} disabled={filteredQuestions.length === 0} className="gap-2">
                Start Quiz <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── REPORT SCREEN ──
  if (quizState === "report") {
    const correct = answers.filter((a) => a.isCorrect).length;
    const total = answers.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    const radarData = sampleErrorReport.map((e) => ({
      type: e.type,
      score: e.percentage,
      fullMark: 100,
    }));

    const barData = sampleErrorReport.map((e) => ({
      name: e.type,
      count: e.count,
      severity: e.severity,
    }));

    const severityBarColor = (severity: string) => {
      if (severity === "high") return "hsl(var(--cognitive-critical))";
      if (severity === "medium") return "hsl(var(--cognitive-risk))";
      return "hsl(var(--cognitive-good))";
    };

    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary mb-2">Quiz Report</h1>
            <p className="text-muted-foreground">Error classification summary & improvement areas</p>
          </div>
          <Button variant="outline" onClick={() => { setQuizState("select"); setAnswers([]); }} className="gap-2">
            <RotateCcw className="w-4 h-4" /> New Quiz
          </Button>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass border-border/50">
            <CardContent className="pt-6 text-center">
              <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-4xl font-bold text-foreground">{pct}%</div>
              <p className="text-sm text-muted-foreground mt-1">{correct}/{total} correct</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-8 h-8 text-cognitive-risk mx-auto mb-2" />
              <div className="text-4xl font-bold text-foreground">{sampleErrorReport.filter(e => e.severity === "high").length}</div>
              <p className="text-sm text-muted-foreground mt-1">Critical error types</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50">
            <CardContent className="pt-6 text-center">
              <BookOpen className="w-8 h-8 text-cognitive-good mx-auto mb-2" />
              <div className="text-4xl font-bold text-foreground">
                {Math.round(answers.reduce((s, a) => s + a.timeSpent, 0) / 60)}m
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total time spent</p>
            </CardContent>
          </Card>
        </div>

        {/* Error Classification */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Error Type Radar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="type" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                  <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-chart-2" /> Error Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={severityBarColor(entry.severity)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Detailed Error Breakdown</CardTitle>
            <CardDescription>Classified by our ML error classifier model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sampleErrorReport.map((err) => (
                <div key={err.type} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <div className={`w-2 h-10 rounded-full ${
                    err.severity === "high" ? "bg-cognitive-critical" : err.severity === "medium" ? "bg-cognitive-risk" : "bg-cognitive-good"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{err.type}</span>
                      <Badge variant={err.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">
                        {err.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{err.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">{err.percentage}%</div>
                    <div className="text-[10px] text-muted-foreground">{err.count} errors</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Improvement Areas */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-cognitive-moderate" /> Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {answers.filter(a => !a.isCorrect).map((a) => {
                const q = quizQuestions.find(qq => qq.id === a.questionId);
                if (!q) return null;
                return (
                  <div key={a.questionId} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{disciplineConfig[q.discipline].icon}</span>
                      <span className="font-medium text-sm text-foreground">{q.topic}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Review: {q.relatedConcepts.join(", ")}</p>
                  </div>
                );
              })}
              {answers.filter(a => !a.isCorrect).length === 0 && (
                <p className="text-sm text-cognitive-good col-span-2">Perfect score! No areas need immediate review. 🎉</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── QUIZ SCREEN ──
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No questions available.</p>
      </div>
    );
  }

  const cfg = disciplineConfig[currentQuestion.discipline];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient-primary">Quiz Me</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Question {currentIndex + 1} of {filteredQuestions.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            {cfg.icon} {cfg.label}
          </Badge>
          <Badge variant={diffBadgeVariant(currentQuestion.difficulty)}>
            {currentQuestion.difficulty}
          </Badge>
        </div>
      </div>
      <Progress value={progress} className="h-1.5" />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          {/* ── FLASHCARD FORMAT ── */}
          {currentQuestion.format === "flashcard" && (
            <div className="perspective-1000">
              <div
                onClick={() => setFlipped(!flipped)}
                className="cursor-pointer"
              >
                <Card className={`glass border-border/50 min-h-[300px] flex items-center justify-center transition-all duration-500 ${
                  flipped ? "bg-primary/5" : ""
                }`}>
                  <CardContent className="text-center p-8">
                    {!flipped ? (
                      <>
                        <Badge variant="outline" className="mb-4">FRONT</Badge>
                        <p className="text-xl font-medium text-foreground leading-relaxed">{currentQuestion.question}</p>
                        <p className="text-xs text-muted-foreground mt-6">Click to flip</p>
                      </>
                    ) : (
                      <>
                        <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">ANSWER</Badge>
                        <p className="text-lg text-foreground leading-relaxed">{currentQuestion.answer}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── WORKING FORMAT (Math) ── */}
          {currentQuestion.format === "working" && (
            <Card className="glass border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] font-mono">{currentQuestion.topic}</Badge>
                </div>
                <CardTitle className="text-xl leading-relaxed">{currentQuestion.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Show your working here... Write each step clearly."
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  className="min-h-[150px] font-mono text-sm bg-secondary/30"
                />

                {/* Voice Recorder */}
                <VoiceRecorder
                  isRecording={isRecording}
                  audioURL={audioURL}
                  onStart={startRecording}
                  onStop={stopRecording}
                />

                {/* Hint */}
                {currentQuestion.hints && (
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setShowHint(!showHint)} className="gap-2 text-muted-foreground">
                      <Lightbulb className="w-4 h-4" /> {showHint ? "Hide Hint" : "Show Hint"}
                    </Button>
                    {showHint && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 p-3 rounded-lg bg-cognitive-moderate/10 border border-cognitive-moderate/20">
                        {currentQuestion.hints.map((h, i) => (
                          <p key={i} className="text-sm text-foreground">💡 {h}</p>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Show Answer */}
                <div>
                  <Button variant="ghost" size="sm" onClick={() => setShowAnswer(!showAnswer)} className="gap-2 text-muted-foreground">
                    {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showAnswer ? "Hide Solution" : "Reveal Solution"}
                  </Button>
                  {showAnswer && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-2">
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Step-by-step solution</p>
                        {currentQuestion.steps?.map((step, i) => (
                          <div key={i} className="flex gap-3 py-1.5">
                            <span className="text-xs font-mono text-primary w-4 flex-shrink-0">{i + 1}.</span>
                            <span className="text-sm text-foreground font-mono">{step}</span>
                          </div>
                        ))}
                        <div className="mt-3 pt-3 border-t border-primary/20">
                          <p className="text-sm font-semibold text-primary font-mono">Answer: {currentQuestion.answer}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── OPEN-ENDED FORMAT ── */}
          {currentQuestion.format === "open-ended" && (
            <Card className="glass border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] font-mono">{currentQuestion.topic}</Badge>
                </div>
                <CardTitle className="text-xl leading-relaxed">{currentQuestion.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-2">📝 Write your answer or use voice recording below</p>
                  <Textarea
                    placeholder="Type your response here..."
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    className="min-h-[120px] bg-transparent border-0 focus-visible:ring-0 p-0 text-sm"
                  />
                </div>

                {/* Voice Recorder */}
                <VoiceRecorder
                  isRecording={isRecording}
                  audioURL={audioURL}
                  onStart={startRecording}
                  onStop={stopRecording}
                />

                {currentQuestion.hints && (
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setShowHint(!showHint)} className="gap-2 text-muted-foreground">
                      <Lightbulb className="w-4 h-4" /> {showHint ? "Hide Hints" : "Show Hints"}
                    </Button>
                    {showHint && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-3 rounded-lg bg-cognitive-moderate/10 border border-cognitive-moderate/20 space-y-1">
                        {currentQuestion.hints.map((h, i) => (
                          <p key={i} className="text-sm text-foreground">💡 {h}</p>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Model Answer */}
                <div>
                  <Button variant="ghost" size="sm" onClick={() => setShowAnswer(!showAnswer)} className="gap-2 text-muted-foreground">
                    {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showAnswer ? "Hide Model Answer" : "Reveal Model Answer"}
                  </Button>
                  {showAnswer && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Model Answer</p>
                      <p className="text-sm text-foreground leading-relaxed">{currentQuestion.answer}</p>
                      <div className="mt-3 pt-3 border-t border-primary/10">
                        <p className="text-xs text-muted-foreground">Common errors to avoid:</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {currentQuestion.commonErrors.map((e, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                              {e}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Self-Assessment + Navigation */}
      <Card className="glass border-border/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-3">How did you do?</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={() => submitAnswer(true)} className="gap-2 bg-cognitive-good/20 text-cognitive-good border border-cognitive-good/30 hover:bg-cognitive-good/30">
              <CheckCircle2 className="w-4 h-4" /> I got it right
            </Button>
            <Button onClick={() => submitAnswer(false)} variant="outline" className="gap-2 border-destructive/30 text-cognitive-critical hover:bg-destructive/10">
              <XCircle className="w-4 h-4" /> I got it wrong
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" disabled={currentIndex === 0} onClick={() => { setCurrentIndex(i => i - 1); resetQuestionState(); }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => submitAnswer(undefined)}>
                Skip <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Voice Recorder Sub-component ──
function VoiceRecorder({ isRecording, audioURL, onStart, onStop }: {
  isRecording: boolean; audioURL: string | null; onStart: () => void; onStop: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/30">
      <Button
        variant={isRecording ? "destructive" : "outline"}
        size="sm"
        onClick={isRecording ? onStop : onStart}
        className="gap-2"
      >
        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {isRecording ? "Stop Recording" : "Record Answer"}
      </Button>
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs text-destructive font-mono">Recording...</span>
        </div>
      )}
      {audioURL && !isRecording && (
        <audio controls src={audioURL} className="h-8 flex-1" />
      )}
      <span className="text-xs text-muted-foreground ml-auto">🎙 Voice input</span>
    </div>
  );
}
