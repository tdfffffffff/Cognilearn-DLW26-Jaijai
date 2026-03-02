import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Loader2, Sparkles, AlertCircle, CheckCircle2, XCircle,
  TriangleAlert, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTopics } from "@/hooks/use-topics";
import { analyzeVoiceUnderstanding, type VoiceAnalysisResult } from "@/lib/api";
import { getMaterialsForTopic } from "@/data/topicStore";

// ── SpeechRecognition type shim ──
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

const getSpeechRecognition = (): (new () => ISpeechRecognition) | null => {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const verdictConfig = {
  correct: {
    icon: CheckCircle2,
    color: "text-cognitive-good",
    bg: "bg-cognitive-good/10 border-cognitive-good/30",
    label: "Correct",
  },
  partially_correct: {
    icon: TriangleAlert,
    color: "text-cognitive-moderate",
    bg: "bg-cognitive-moderate/10 border-cognitive-moderate/30",
    label: "Partially Correct",
  },
  incorrect: {
    icon: XCircle,
    color: "text-cognitive-critical",
    bg: "bg-cognitive-critical/10 border-cognitive-critical/30",
    label: "Incorrect",
  },
};

const TeachMeVoice = () => {
  const topics = useTopics();
  const [selectedTopic, setSelectedTopic] = useState(topics[0]?.id || "");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [analysis, setAnalysis] = useState<VoiceAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const fullTranscriptRef = useRef("");

  useEffect(() => {
    if (!getSpeechRecognition()) {
      setSpeechSupported(false);
    }
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    setError(null);
    setAnalysis(null);
    setTranscription("");
    setInterimTranscript("");
    fullTranscriptRef.current = "";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        fullTranscriptRef.current = final.trim();
        setTranscription(final.trim());
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript("");

    const transcript = fullTranscriptRef.current;
    if (!transcript.trim()) {
      setError("No speech detected. Please try again.");
      return;
    }

    // Send to OpenAI for analysis
    setIsProcessing(true);
    try {
      const topicName = topics.find((t) => t.id === selectedTopic)?.topic || selectedTopic;
      const materialsCtx = getMaterialsForTopic(selectedTopic);
      const result = await analyzeVoiceUnderstanding(
        transcript,
        topicName,
        materialsCtx || undefined,
      );
      setAnalysis(result);
    } catch (err: any) {
      setError(`Failed to analyze: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedTopic, topics]);

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const accuracyColor = (acc: number) => {
    if (acc >= 80) return "text-cognitive-good";
    if (acc >= 50) return "text-cognitive-moderate";
    return "text-cognitive-critical";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Teach Me</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explain a concept in your own words — AI will check your understanding
        </p>
      </div>

      {/* Topic Selector */}
      <Card className="glass border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">Topic:</label>
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                {topics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.icon} {t.topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground ml-auto">
              Select the topic you'll be explaining
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mic Capture Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-8 flex flex-col items-center"
      >
        {!speechSupported && (
          <div className="mb-4 p-3 rounded-lg bg-cognitive-risk/10 border border-cognitive-risk/30 text-sm text-cognitive-risk">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Speech recognition requires Chrome or Edge browser.
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-6">
          {isRecording
            ? "Listening... Explain the concept in your own words"
            : isProcessing
            ? "Analyzing your understanding with AI..."
            : "Press the mic and explain a concept — AI will check if you're correct"}
        </p>

        <motion.button
          onClick={handleRecord}
          disabled={isProcessing || !speechSupported}
          whileTap={{ scale: 0.95 }}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 ${
            isRecording
              ? "bg-cognitive-critical/20 border-2 border-cognitive-critical glow-risk"
              : "bg-primary/10 border-2 border-primary/30 hover:border-primary glow-primary"
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-8 h-8 text-cognitive-critical" />
          ) : (
            <Mic className="w-8 h-8 text-primary" />
          )}
        </motion.button>

        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex flex-col items-center gap-2"
          >
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 1.5 + Math.random() * 1.5, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1 h-4 rounded-full bg-primary"
                />
              ))}
            </div>
            <span className="text-xs text-primary font-mono">Recording — click mic to stop</span>
          </motion.div>
        )}

        {/* Live transcript preview */}
        {(transcription || interimTranscript) && isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 w-full max-w-lg p-3 rounded-lg bg-card border border-border"
          >
            <p className="text-xs text-muted-foreground mb-1">Live transcript:</p>
            <p className="text-sm text-foreground">
              {transcription}
              {interimTranscript && (
                <span className="text-muted-foreground italic"> {interimTranscript}</span>
              )}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Analysis Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Overall Score */}
            <Card className="glass border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Understanding Analysis
                  </CardTitle>
                  <div className="text-right">
                    <span className={`text-3xl font-bold ${accuracyColor(analysis.overall_accuracy)}`}>
                      {analysis.overall_accuracy}%
                    </span>
                    <p className="text-xs text-muted-foreground">accuracy</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={analysis.overall_accuracy} className="h-2 mb-4" />
                <p className="text-sm text-muted-foreground leading-relaxed">{analysis.feedback}</p>
              </CardContent>
            </Card>

            {/* Transcription with original text */}
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-sm">Your Explanation (Transcription)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed bg-card rounded-lg p-4 border border-border">
                  {analysis.transcript}
                </p>
              </CardContent>
            </Card>

            {/* Sentence-by-sentence analysis */}
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-sm">Sentence-by-Sentence Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.sentences.map((sentence, i) => {
                  const cfg = verdictConfig[sentence.verdict as keyof typeof verdictConfig] || verdictConfig.incorrect;
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`rounded-lg border p-4 ${cfg.bg}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] ${cfg.color} border-current`}>
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground font-medium italic">
                            &ldquo;{sentence.original}&rdquo;
                          </p>
                          <p className="text-xs text-muted-foreground">{sentence.explanation}</p>
                          {sentence.correction && (
                            <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                              <p className="text-xs text-muted-foreground mb-1">Corrected:</p>
                              <p className="text-sm text-foreground">{sentence.correction}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.strengths.length > 0 && (
                <Card className="glass border-cognitive-good/20">
                  <CardHeader>
                    <CardTitle className="text-sm text-cognitive-good flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> What You Got Right
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-cognitive-good mt-1">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {analysis.weaknesses.length > 0 && (
                <Card className="glass border-cognitive-risk/20">
                  <CardHeader>
                    <CardTitle className="text-sm text-cognitive-risk flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Areas to Improve
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-cognitive-risk mt-1">•</span> {w}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Missing Concepts */}
            {analysis.missing_concepts.length > 0 && (
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cognitive-moderate" />
                    Concepts You Didn't Mention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.missing_concepts.map((concept, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-cognitive-moderate/10 border-cognitive-moderate/30 text-cognitive-moderate"
                      >
                        {concept}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Try explaining these concepts in your next attempt for a more complete understanding.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Try Again */}
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setAnalysis(null);
                  setTranscription("");
                  setError(null);
                }}
                variant="outline"
                className="gap-2"
              >
                <Mic className="w-4 h-4" /> Try Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeachMeVoice;
