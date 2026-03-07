import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Mic, MicOff, RotateCcw, ChevronRight, ChevronLeft, CheckCircle2, XCircle,
  Lightbulb, Eye, EyeOff, BarChart3, AlertTriangle, BookOpen, Trophy,
  MessageSquare, GraduationCap, Send, Loader2, Volume2, Sparkles,
  VolumeX, ArrowLeft, Camera, Upload, FileText, PenTool, Zap,
} from "lucide-react";
import {
  quizQuestions, sampleErrorReport, disciplineConfig,
  type QuizQuestion, type Discipline, type QuizFormat, type ErrorClassification
} from "@/data/quizData";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";
import { useTopics } from "@/hooks/use-topics";
import { chatWithTutor, analyzeVoiceUnderstanding, generateQuizFromMaterials, generateQuizQuestions, assessQuizAnswer, type VoiceAnalysisResult, type GeneratedQuestion, type QuizAssessmentResult, type QuizQuestionGenerated } from "@/lib/api";
import { getMaterialsForTopic } from "@/data/topicStore";
import { updateErrorProfile } from "@/data/errorProfileStore";
import { LatexRenderer } from "@/components/LatexRenderer";
import EmergencyMode from "@/components/EmergencyMode";
import { getQuestions } from "@/data/questionBank";

type QuizState = "select" | "quiz" | "review" | "report";
type QuizMode = "ask" | "practice" | "test" | "emergency";
type DifficultyLevel = "easy" | "medium" | "hard" | "even_harder";
/** Practice sub-mode: pick a generated question or free-explain "teach-me" style */
type PracticeView = "menu" | "question" | "teach";

const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; emoji: string; color: string; bgColor: string; description: string }> = {
  easy: {
    label: "Easy",
    emoji: "🟢",
    color: "text-emerald-400",
    bgColor: "border-emerald-500/40 bg-emerald-500/10",
    description: "Foundational concepts & recall",
  },
  medium: {
    label: "Medium",
    emoji: "🟡",
    color: "text-yellow-400",
    bgColor: "border-yellow-500/40 bg-yellow-500/10",
    description: "Apply understanding to problems",
  },
  hard: {
    label: "Hard",
    emoji: "🔴",
    color: "text-red-400",
    bgColor: "border-red-500/40 bg-red-500/10",
    description: "Multi-step & analytical challenges",
  },
  even_harder: {
    label: "Even Harder",
    emoji: "💀",
    color: "text-purple-400",
    bgColor: "border-purple-500/40 bg-purple-500/10",
    description: "Olympiad-level & creative problems",
  },
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UserAnswer {
  questionId: string;
  textAnswer: string;
  audioBlob?: Blob;
  isCorrect?: boolean;
  errorTypes: string[];
  timeSpent: number;
}

// ── SpeechRecognition shim ──
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

const getSpeechRecognition = (): (new () => ISpeechRecognition) | null => {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

const speechSupported = !!getSpeechRecognition();

const severityColor = (s: string) =>
  s === "high" ? "text-cognitive-critical" : s === "medium" ? "text-cognitive-risk" : "text-cognitive-good";

const diffBadgeVariant = (d: string) =>
  d === "hard" ? "destructive" : d === "medium" ? "secondary" : "outline";

const verdictConfig = {
  correct: {
    icon: CheckCircle2,
    color: "text-cognitive-good",
    bg: "bg-cognitive-good/10 border-cognitive-good/30",
    label: "Correct",
  },
  partially_correct: {
    icon: AlertTriangle,
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

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════════
export default function QuizMe() {
  const topics = useTopics();

  // ── Core quiz state ──
  const [quizState, setQuizState] = useState<QuizState>("select");
  const [quizMode, setQuizMode] = useState<QuizMode>("practice");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");

  // ── Standard quiz state (for flashcard/working/open-ended) ──
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  // ── Ask Mode state ──
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Practice Mode state ──
  const [practiceView, setPracticeView] = useState<PracticeView>("menu");
  const [practiceQuestions, setPracticeQuestions] = useState<GeneratedQuestion[]>([]);
  const [selectedPracticeQ, setSelectedPracticeQ] = useState<number | null>(null);
  const [practiceVoiceTranscript, setPracticeVoiceTranscript] = useState("");
  const [practiceInterim, setPracticeInterim] = useState("");
  const [practiceAnalysis, setPracticeAnalysis] = useState<VoiceAnalysisResult | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // ── Teach Me (free-form voice explain) inside practice ──
  const [teachTranscript, setTeachTranscript] = useState("");
  const [teachInterim, setTeachInterim] = useState("");
  const [teachAnalysis, setTeachAnalysis] = useState<VoiceAnalysisResult | null>(null);
  const [teachLoading, setTeachLoading] = useState(false);

  // ── Test Mode state (text-based quiz with camera/image support) ──
  const [testQuestions, setTestQuestions] = useState<QuizQuestionGenerated[]>([]);
  const [testCurrentIdx, setTestCurrentIdx] = useState(0);
  const [testAnswer, setTestAnswer] = useState("");
  const [testImageBase64, setTestImageBase64] = useState<string | null>(null);
  const [testImagePreview, setTestImagePreview] = useState<string | null>(null);
  const [testAssessment, setTestAssessment] = useState<QuizAssessmentResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testGenerating, setTestGenerating] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showTestHint, setShowTestHint] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const fullTranscriptRef = useRef("");

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════
  const selectedTopicName = topics.find((t) => selectedTopicIds.includes(t.id))?.topic || "your topic";

  const filteredQuestions = quizQuestions.filter(
    (q) => selectedTopicIds.length === 0 || selectedTopicIds.some((id) => {
      const topicName = topics.find((t) => t.id === id)?.topic || "";
      return q.topic.toLowerCase().includes(topicName.toLowerCase()) ||
             topicName.toLowerCase().includes(q.topic.toLowerCase().split(" ")[0]);
    })
  );
  const currentQuestion = filteredQuestions[currentIndex];
  const progress = filteredQuestions.length > 0 ? ((currentIndex + 1) / filteredQuestions.length) * 100 : 0;

  const toggleTopic = (id: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Start quiz / mode
  // ═══════════════════════════════════════════════════════════════════════════
  const startQuiz = () => {
    setCurrentIndex(0);
    setAnswers([]);
    setChatMessages([]);
    setPracticeQuestions([]);
    setSelectedPracticeQ(null);
    setPracticeAnalysis(null);
    setPracticeView("menu");
    setTeachAnalysis(null);
    setTeachTranscript("");
    setTestQuestions([]);
    setTestCurrentIdx(0);
    setTestAnswer("");
    setTestImageBase64(null);
    setTestImagePreview(null);
    setTestAssessment(null);
    setShowTestHint(false);

    if (quizMode === "ask") {
      setQuizState("quiz");
      setChatMessages([{
        role: "assistant",
        content: `Hi! I'm your AI tutor. Let's talk about **${selectedTopicName}**.\n\nYou can ask me anything — type or press the mic button to speak. I'll read my answers to you too!`,
      }]);
    } else if (quizMode === "test") {
      setQuizState("quiz");
      generateTestQuestions();
    } else {
      setQuizState("quiz");
      generatePracticeQuestions();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Practice Mode: generate questions from materials / topic
  // ═══════════════════════════════════════════════════════════════════════════
  const generatePracticeQuestions = async () => {
    setGeneratingQuestions(true);
    const selectedTopic = topics.find((t) => selectedTopicIds.includes(t.id));
    if (!selectedTopic) { setGeneratingQuestions(false); return; }

    const materials = getMaterialsForTopic(selectedTopic.id);
    if (materials) {
      try {
        const result = await generateQuizFromMaterials(selectedTopic.topic, materials, 5);
        setPracticeQuestions(result.questions);
      } catch {
        setPracticeQuestions(defaultQuestions(selectedTopic.topic));
      }
    } else {
      setPracticeQuestions(defaultQuestions(selectedTopic.topic));
    }
    setGeneratingQuestions(false);
  };

  const defaultQuestions = (topic: string): GeneratedQuestion[] => [
    { question: `Explain the core principles of ${topic}`, answer: "", difficulty: "medium", source_reference: "", related_concepts: [], hints: [] },
    { question: `What are the most common mistakes students make in ${topic}?`, answer: "", difficulty: "medium", source_reference: "", related_concepts: [], hints: [] },
    { question: `How does ${topic} connect to other subjects you're studying?`, answer: "", difficulty: "hard", source_reference: "", related_concepts: [], hints: [] },
    { question: `Describe a real-world application of ${topic}`, answer: "", difficulty: "easy", source_reference: "", related_concepts: [], hints: [] },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // Test Mode: generate questions, camera/image capture, assess answers
  // ═══════════════════════════════════════════════════════════════════════════
  const generateTestQuestions = async () => {
    setTestGenerating(true);
    const selectedTopic = topics.find((t) => selectedTopicIds.includes(t.id));
    if (!selectedTopic) { setTestGenerating(false); return; }

    // 1. Try the local question bank first (instant, no API call)
    const localQuestions = getQuestions(selectedTopic.id, difficulty, 5);
    if (localQuestions.length >= 3) {
      setTestQuestions(localQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        correct_answer: q.correct_answer,
        difficulty: q.difficulty,
        hints: q.hints,
        topic_area: q.topic_area,
      })));
      setTestGenerating(false);
      return;
    }

    // 2. Fallback: call AI to generate questions
    const materials = getMaterialsForTopic(selectedTopic.id);
    try {
      const result = await generateQuizQuestions(selectedTopic.topic, 5, materials || undefined, difficulty);
      setTestQuestions(result.questions);
    } catch {
      setTestQuestions([
        { id: "q1", question: `Solve a key problem in ${selectedTopic.topic}`, correct_answer: "", difficulty, hints: [], topic_area: selectedTopic.topic },
        { id: "q2", question: `Explain the fundamental theorem related to ${selectedTopic.topic}`, correct_answer: "", difficulty, hints: [], topic_area: selectedTopic.topic },
        { id: "q3", question: `Derive the formula for a concept in ${selectedTopic.topic}`, correct_answer: "", difficulty, hints: [], topic_area: selectedTopic.topic },
      ]);
    }
    setTestGenerating(false);
  };

  const submitTestAnswer = async () => {
    const currentQ = testQuestions[testCurrentIdx];
    if (!currentQ) return;
    if (!testAnswer.trim() && !testImageBase64) return;

    const materials = selectedTopicIds.length > 0 ? getMaterialsForTopic(selectedTopicIds[0]) : "";
    setTestLoading(true);
    setTestAssessment(null);

    try {
      const result = await assessQuizAnswer(
        currentQ.question,
        testAnswer,
        selectedTopicName,
        testImageBase64 || undefined,
        materials || undefined,
      );
      setTestAssessment(result);

      // Update the error profile store so the hexagonal chart auto-adjusts
      if (result.error_classifications) {
        updateErrorProfile(result.error_classifications);
      }
    } catch (err: any) {
      setTestAssessment({
        assessment: `Error: ${err.message}. Make sure the backend is running.`,
        score: 0,
        error_classifications: [],
        errors_found: [],
        feedback: "Could not assess your answer. Please try again.",
        latex_solution: "",
      });
    } finally {
      setTestLoading(false);
    }
  };

  const nextTestQuestion = () => {
    if (testCurrentIdx < testQuestions.length - 1) {
      setTestCurrentIdx((i) => i + 1);
      setTestAnswer("");
      setTestImageBase64(null);
      setTestImagePreview(null);
      setTestAssessment(null);
      setShowTestHint(false);
    }
  };

  // Camera capture
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setTestImagePreview(dataUrl);
      setTestImageBase64(dataUrl.split(",")[1]); // strip data URI prefix
    }
    // Stop camera
    const stream = video.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    setShowCamera(false);
  };

  const stopCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach((t) => t.stop());
    }
    setShowCamera(false);
  };

  // Image upload from file
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setTestImagePreview(dataUrl);
      setTestImageBase64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Ask Mode — Chat
  // ═══════════════════════════════════════════════════════════════════════════
  const sendChatMessage = async (text?: string) => {
    const msg = text || chatInput.trim();
    if (!msg || chatLoading) return;

    const materials = selectedTopicIds.length > 0 ? getMaterialsForTopic(selectedTopicIds[0]) : "";
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
      const reply = await chatWithTutor(msg, selectedTopicName, history, materials || undefined);
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      // Auto-speak AI reply
      if (autoSpeak && reply) {
        speakText(reply);
      }
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Sorry, something went wrong: ${err.message}. Make sure the backend is running.` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Ask Mode: Voice input (single utterance → send) ──
  const startVoiceChat = () => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    // Stop any ongoing speech so it doesn't interfere
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalText = "";
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setChatInput(finalText + interim);
    };
    recognition.onerror = () => { setIsRecording(false); setChatInput(""); };
    recognition.onend = () => {
      setIsRecording(false);
      if (finalText.trim()) {
        setChatInput("");
        sendChatMessage(finalText.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopVoiceChat = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  // ── Text-to-Speech ──
  const speakText = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const clean = text.replace(/[*_#`~\[\]()>!]/g, "").replace(/\n+/g, ". ");
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Practice Mode — Voice recording (continuous for explanation)
  // ═══════════════════════════════════════════════════════════════════════════
  const startPracticeVoice = (target: "question" | "teach") => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const setTranscript = target === "question" ? setPracticeVoiceTranscript : setTeachTranscript;
    const setInterim = target === "question" ? setPracticeInterim : setTeachInterim;
    if (target === "question") setPracticeAnalysis(null);
    else setTeachAnalysis(null);

    setTranscript("");
    setInterim("");
    fullTranscriptRef.current = "";

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final) {
        fullTranscriptRef.current = final.trim();
        setTranscript(final.trim());
      }
      setInterim(interim);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopPracticeVoice = async (target: "question" | "teach") => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);

    const transcript = fullTranscriptRef.current.trim();
    if (!transcript) return;

    const setLoading = target === "question" ? setPracticeLoading : setTeachLoading;
    const setAnalysis = target === "question" ? setPracticeAnalysis : setTeachAnalysis;

    setLoading(true);
    try {
      const materials = selectedTopicIds.length > 0 ? getMaterialsForTopic(selectedTopicIds[0]) : "";
      const result = await analyzeVoiceUnderstanding(transcript, selectedTopicName, materials || undefined);
      setAnalysis(result);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setAnalysis({
        topic: selectedTopicName,
        transcript,
        sentences: [{ original: transcript, verdict: "partially_correct", explanation: `Could not reach the analysis server: ${err.message}. Make sure the backend is running on port 8000.`, correction: null }],
        missing_concepts: [],
        overall_accuracy: 0,
        feedback: `Analysis failed: ${err.message}. Please check that the backend server is running.`,
        strengths: [],
        weaknesses: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Standard quiz: media recorder ──
  const startRecordingMedia = useCallback(async () => {
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

  const stopRecordingMedia = useCallback(() => {
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
    setTextAnswer(""); setShowAnswer(false); setShowHint(false);
    setAudioURL(null); setFlipped(false); setStartTime(Date.now());
  };

  const goBack = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsRecording(false);
    recognitionRef.current?.stop();
    setQuizState("select");
    setChatMessages([]);
    setPracticeQuestions([]);
    setPracticeAnalysis(null);
    setSelectedPracticeQ(null);
    setPracticeView("menu");
    setTeachAnalysis(null);
    setTeachTranscript("");
    setTestQuestions([]);
    setTestAssessment(null);
    setTestAnswer("");
    setTestImageBase64(null);
    setTestImagePreview(null);
    stopCamera();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: SELECT SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (quizState === "select") {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">Quiz Me</h1>
          <p className="text-muted-foreground">
            Choose a mode and your topics to begin learning.
          </p>
        </div>

        {/* Mode Selection */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Choose Mode</CardTitle>
            <CardDescription>Select how you want to study</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setQuizMode("ask")}
                className={`p-6 rounded-lg border text-left transition-all duration-200 ${
                  quizMode === "ask"
                    ? "border-primary bg-primary/10 glow-primary"
                    : "border-border/50 bg-card/50 hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Ask Mode</div>
                    <div className="text-xs text-muted-foreground">Conversational</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Have a real-time conversation with our AI tutor. Speak or type your questions — hear the answers read aloud to you.
                </p>
              </button>

              <button
                onClick={() => setQuizMode("practice")}
                className={`p-6 rounded-lg border text-left transition-all duration-200 ${
                  quizMode === "practice"
                    ? "border-primary bg-primary/10 glow-primary"
                    : "border-border/50 bg-card/50 hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-cognitive-moderate/10">
                    <GraduationCap className="w-6 h-6 text-cognitive-moderate" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Practice Mode</div>
                    <div className="text-xs text-muted-foreground">Voice + AI Feedback</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI generates questions or you can freely explain concepts (Teach Me). Use voice-to-text to answer — AI checks your understanding sentence by sentence.
                </p>
              </button>

              <button
                onClick={() => setQuizMode("test")}
                className={`p-6 rounded-lg border text-left transition-all duration-200 ${
                  quizMode === "test"
                    ? "border-primary bg-primary/10 glow-primary"
                    : "border-border/50 bg-card/50 hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-cognitive-excellent/10">
                    <PenTool className="w-6 h-6 text-cognitive-excellent" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Quiz Mode</div>
                    <div className="text-xs text-muted-foreground">Text + Camera</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI generates questions — answer by typing or photographing your handwritten work. Errors are classified into 6 cognitive categories and update your fingerprint.
                </p>
              </button>

              <button
                onClick={() => setQuizMode("emergency")}
                className={`p-6 rounded-lg border text-left transition-all duration-200 relative overflow-hidden ${
                  quizMode === "emergency"
                    ? "border-cognitive-risk bg-cognitive-risk/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                    : "border-border/50 bg-card/50 hover:border-cognitive-risk/40"
                }`}
              >
                {quizMode === "emergency" && (
                  <div className="absolute inset-0 bg-gradient-to-br from-cognitive-risk/5 to-transparent pointer-events-none" />
                )}
                <div className="flex items-center gap-3 mb-3 relative">
                  <div className="p-2 rounded-lg bg-cognitive-risk/10">
                    <Zap className="w-6 h-6 text-cognitive-risk" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      Emergency Mode
                      <Badge variant="outline" className="text-[9px] bg-cognitive-risk/10 text-cognitive-risk border-cognitive-risk/30">NEW</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Rapid Revision</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground relative">
                  Exam in 2 hours? AI generates key concept flashcards — mark "Got it" or "Don't understand" for instant detailed explanations.
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Difficulty Selection — Quiz Mode only */}
        {quizMode === "test" && (
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Choose Difficulty</CardTitle>
              <CardDescription>AI will generate questions at this level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.entries(DIFFICULTY_CONFIG) as [DifficultyLevel, typeof DIFFICULTY_CONFIG[DifficultyLevel]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setDifficulty(key)}
                    className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                      difficulty === key
                        ? `${cfg.bgColor} glow-primary`
                        : "border-border/50 bg-card/50 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{cfg.emoji}</span>
                      <span className={`font-semibold text-sm ${difficulty === key ? cfg.color : "text-foreground"}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cfg.description}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topic/Discipline Selection */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Choose Disciplines</CardTitle>
            <CardDescription>Topics correspond to your Cognitive Fingerprint folders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                    selectedTopicIds.includes(topic.id)
                      ? "border-primary bg-primary/10 glow-primary"
                      : "border-border/50 bg-card/50 hover:border-primary/40"
                  }`}
                >
                  <div className="text-2xl mb-2">{topic.icon}</div>
                  <div className="font-medium text-sm text-foreground">{topic.topic}</div>
                  <div className="text-xs text-muted-foreground mt-1">{topic.mastery}% mastery</div>
                  <div className="w-full h-1 rounded-full bg-muted mt-2">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${topic.mastery}%` }} />
                  </div>
                  {topic.uploadedMaterials.length > 0 && (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {topic.uploadedMaterials.length} material{topic.uploadedMaterials.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedTopicIds.length} topic{selectedTopicIds.length !== 1 ? "s" : ""} selected · {quizMode === "ask" ? "Ask" : quizMode === "test" ? "Quiz" : quizMode === "emergency" ? "Emergency" : "Practice"} Mode
              </p>
              <Button onClick={startQuiz} disabled={selectedTopicIds.length === 0} className="gap-2">
                Start {quizMode === "ask" ? "Conversation" : quizMode === "test" ? "Quiz" : quizMode === "emergency" ? "Emergency" : "Practice"} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: EMERGENCY MODE — Rapid flashcard revision
  // ═══════════════════════════════════════════════════════════════════════════
  if (quizState === "quiz" && quizMode === "emergency") {
    return (
      <EmergencyMode
        topicId={selectedTopicIds[0] ?? ""}
        topicName={selectedTopicName}
        onBack={() => setQuizState("select")}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: ASK MODE — Conversational chat with voice I/O
  // ═══════════════════════════════════════════════════════════════════════════
  if (quizState === "quiz" && quizMode === "ask") {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gradient-primary">Ask Mode</h1>
            <p className="text-sm text-muted-foreground mt-1">Conversation with AI tutor about {selectedTopicName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setAutoSpeak(!autoSpeak); if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); } }}
              className={`gap-1 text-xs ${autoSpeak ? "text-primary" : "text-muted-foreground"}`}
              title={autoSpeak ? "Auto-speak ON" : "Auto-speak OFF"}
            >
              {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {autoSpeak ? "Voice On" : "Voice Off"}
            </Button>
            <Button variant="outline" onClick={goBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <Card className="glass border-border/50">
          <CardContent className="pt-6">
            <div className="h-[450px] overflow-y-auto space-y-4 pr-2">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] rounded-xl p-4 ${
                    msg.role === "user"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-secondary/50 border border-border/50"
                  }`}>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-6 text-[10px] text-muted-foreground gap-1"
                        onClick={() => speakText(msg.content)}
                      >
                        <Volume2 className="w-3 h-3" /> {isSpeaking ? "Stop" : "Listen"}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary/50 border border-border/50 rounded-xl p-4 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </CardContent>
        </Card>

        {/* Chat Input Bar */}
        <Card className="glass border-border/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={isRecording ? stopVoiceChat : startVoiceChat}
                disabled={chatLoading}
                className="gap-2 flex-shrink-0"
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isRecording ? "Stop" : "Speak"}
              </Button>
              <Input
                placeholder="Type your question..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                className="flex-1"
                disabled={chatLoading}
              />
              <Button
                size="sm"
                onClick={() => sendChatMessage()}
                disabled={!chatInput.trim() || chatLoading}
                className="gap-2 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {isRecording && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs text-destructive font-mono">Listening... speak your question</span>
                <div className="flex gap-0.5 ml-2">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ scaleY: [1, 1.5 + Math.random() * 1.5, 1] }}
                      transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.08 }}
                      className="w-0.5 h-3 rounded-full bg-destructive"
                    />
                  ))}
                </div>
              </div>
            )}
            {!speechSupported && (
              <p className="text-[10px] text-muted-foreground mt-2">Voice input requires Chrome or Edge.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: PRACTICE MODE — Questions + Teach Me
  // ═══════════════════════════════════════════════════════════════════════════
  if (quizState === "quiz" && quizMode === "practice") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gradient-primary">Practice Mode</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {practiceView === "menu" ? "Choose an option below" :
               practiceView === "teach" ? "Explain the concept — AI will check your understanding" :
               "Answer the question using your voice"}
            </p>
          </div>
          <Button variant="outline" onClick={practiceView === "menu" ? goBack : () => {
            setPracticeView("menu"); setPracticeAnalysis(null); setTeachAnalysis(null);
            setSelectedPracticeQ(null); setPracticeVoiceTranscript(""); setTeachTranscript("");
            setIsRecording(false); recognitionRef.current?.stop();
          }} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> {practiceView === "menu" ? "Back" : "Menu"}
          </Button>
        </div>

        {generatingQuestions ? (
          <Card className="glass border-border/50">
            <CardContent className="pt-6 flex items-center justify-center gap-3 py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating questions for {selectedTopicName}...</span>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── PRACTICE MENU ── */}
            {practiceView === "menu" && (
              <div className="space-y-4">
                {/* Teach Me Card */}
                <Card className="glass border-border/50 hover:border-primary/40 transition-all cursor-pointer"
                      onClick={() => setPracticeView("teach")}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Mic className="w-7 h-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg">Teach Me</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Explain <strong>{selectedTopicName}</strong> in your own words. AI will analyse what you got right, what's wrong, and what you missed — sentence by sentence.
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                {/* AI-Generated Questions */}
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-cognitive-moderate" />
                      Answer a Question
                    </CardTitle>
                    <CardDescription>
                      AI-generated questions based on {selectedTopicName}. Pick one and explain your answer using voice.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {practiceQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedPracticeQ(i); setPracticeView("question"); setPracticeAnalysis(null); setPracticeVoiceTranscript(""); }}
                        className="w-full text-left p-4 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary">{i + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{q.question}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={diffBadgeVariant(q.difficulty)} className="text-[10px]">{q.difficulty}</Badge>
                              {q.source_reference && (
                                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary">From your materials</Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                    {practiceQuestions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No questions generated yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── TEACH ME VIEW ── */}
            {practiceView === "teach" && (
              <div className="space-y-6">
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mic className="w-5 h-5 text-primary" /> Teach Me: {selectedTopicName}
                    </CardTitle>
                    <CardDescription>
                      Press the mic and explain everything you know about this topic. When you stop, AI will check your understanding sentence by sentence.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VoiceExplainArea
                      isRecording={isRecording}
                      isLoading={teachLoading}
                      transcript={teachTranscript}
                      interim={teachInterim}
                      onStart={() => startPracticeVoice("teach")}
                      onStop={() => stopPracticeVoice("teach")}
                    />
                  </CardContent>
                </Card>

                {teachAnalysis && (
                  <AnalysisResult analysis={teachAnalysis} onTryAgain={() => { setTeachAnalysis(null); setTeachTranscript(""); setTeachInterim(""); }} />
                )}
              </div>
            )}

            {/* ── QUESTION VIEW ── */}
            {practiceView === "question" && selectedPracticeQ !== null && (
              <div className="space-y-6">
                <Card className="glass border-border/50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">Question {selectedPracticeQ + 1}</Badge>
                      <Badge variant={diffBadgeVariant(practiceQuestions[selectedPracticeQ].difficulty)} className="text-[10px]">
                        {practiceQuestions[selectedPracticeQ].difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl mt-2">{practiceQuestions[selectedPracticeQ].question}</CardTitle>
                    {practiceQuestions[selectedPracticeQ].source_reference && (
                      <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                        <p className="text-[10px] text-muted-foreground mb-1">Source from your materials:</p>
                        <p className="text-xs text-foreground italic">{practiceQuestions[selectedPracticeQ].source_reference}</p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <VoiceExplainArea
                      isRecording={isRecording}
                      isLoading={practiceLoading}
                      transcript={practiceVoiceTranscript}
                      interim={practiceInterim}
                      onStart={() => startPracticeVoice("question")}
                      onStop={() => stopPracticeVoice("question")}
                    />
                  </CardContent>
                </Card>

                {practiceAnalysis && (
                  <AnalysisResult analysis={practiceAnalysis} onTryAgain={() => { setPracticeAnalysis(null); setPracticeVoiceTranscript(""); setPracticeInterim(""); }} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: TEST MODE — Text-based quiz with camera/image + error classification
  // ═══════════════════════════════════════════════════════════════════════════
  if (quizState === "quiz" && quizMode === "test") {
    const currentQ = testQuestions[testCurrentIdx];
    const testProgress = testQuestions.length > 0 ? ((testCurrentIdx + 1) / testQuestions.length) * 100 : 0;

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gradient-primary">Quiz Mode</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {testGenerating ? "Generating questions..." : `Question ${testCurrentIdx + 1} of ${testQuestions.length} · ${selectedTopicName}`}
            </p>
          </div>
          <Button variant="outline" onClick={goBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>

        {testQuestions.length > 0 && <Progress value={testProgress} className="h-1.5" />}

        {testGenerating ? (
          <Card className="glass border-border/50">
            <CardContent className="pt-6 flex items-center justify-center gap-3 py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating quiz questions for {selectedTopicName}...</span>
            </CardContent>
          </Card>
        ) : currentQ ? (
          <>
            {/* Question Card */}
            <Card className="glass border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Question {testCurrentIdx + 1}</Badge>
                  <Badge variant={diffBadgeVariant(currentQ.difficulty)} className="text-[10px]">{currentQ.difficulty}</Badge>
                  {currentQ.topic_area && (
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary">{currentQ.topic_area}</Badge>
                  )}
                </div>
                <CardTitle className="text-xl mt-3 leading-relaxed">
                  <LatexRenderer text={currentQ.question} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hints */}
                {currentQ.hints && currentQ.hints.length > 0 && (
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setShowTestHint(!showTestHint)} className="gap-2 text-muted-foreground">
                      <Lightbulb className="w-4 h-4" /> {showTestHint ? "Hide Hints" : "Show Hints"}
                    </Button>
                    {showTestHint && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-3 rounded-lg bg-cognitive-moderate/10 border border-cognitive-moderate/20 space-y-1">
                        {currentQ.hints.map((h, i) => (
                          <p key={i} className="text-sm text-foreground">💡 <LatexRenderer text={h} /></p>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Text Answer Input */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Type your answer:</p>
                  <Textarea
                    placeholder="Write your solution here... You can use plain text or LaTeX notation."
                    value={testAnswer}
                    onChange={(e) => setTestAnswer(e.target.value)}
                    className="min-h-[120px] font-mono text-sm bg-secondary/30"
                    disabled={testLoading}
                  />
                </div>

                {/* Camera + Image Upload */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground">Or submit a photo of your handwritten work:</p>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={startCamera} disabled={testLoading || showCamera} className="gap-2">
                      <Camera className="w-4 h-4" /> Take Photo
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={testLoading} className="gap-2">
                      <Upload className="w-4 h-4" /> Upload Image
                    </Button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {testImagePreview && (
                      <Button variant="ghost" size="sm" onClick={() => { setTestImageBase64(null); setTestImagePreview(null); }}
                        className="text-xs text-muted-foreground gap-1">
                        <XCircle className="w-3 h-3" /> Remove image
                      </Button>
                    )}
                  </div>

                  {/* Camera View */}
                  {showCamera && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative rounded-lg overflow-hidden border border-border">
                      <video ref={videoRef} className="w-full max-h-[300px] object-cover" autoPlay playsInline muted />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                        <Button onClick={capturePhoto} className="gap-2 bg-primary/90">
                          <Camera className="w-4 h-4" /> Capture
                        </Button>
                        <Button variant="outline" onClick={stopCamera} className="gap-2 bg-background/80">
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Image Preview */}
                  {testImagePreview && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                      <img src={testImagePreview} alt="Your work" className="max-h-[200px] rounded-lg border border-border object-contain" />
                      <p className="text-[10px] text-muted-foreground mt-1">✓ Image attached — AI will read your handwritten work</p>
                    </motion.div>
                  )}
                </div>

                {/* Submit */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={submitTestAnswer}
                    disabled={testLoading || (!testAnswer.trim() && !testImageBase64)}
                    className="gap-2"
                  >
                    {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {testLoading ? "Assessing..." : "Submit Answer"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Assessment Result */}
            {testAssessment && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Score & Assessment */}
                <Card className="glass border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" /> AI Assessment
                      </CardTitle>
                      <div className="text-right">
                        <span className={`text-3xl font-bold ${
                          testAssessment.score >= 80 ? "text-cognitive-good" :
                          testAssessment.score >= 50 ? "text-cognitive-moderate" : "text-cognitive-critical"
                        }`}>
                          {testAssessment.score}%
                        </span>
                        <p className="text-xs text-muted-foreground">score</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={testAssessment.score} className="h-2" />
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      <LatexRenderer text={testAssessment.assessment} />
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1 font-semibold">Feedback:</p>
                      <div className="text-sm text-foreground">
                        <LatexRenderer text={testAssessment.feedback} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Error Classification Radar */}
                {testAssessment.error_classifications.length > 0 && (
                  <Card className="glass border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" /> Cognitive Error Profile
                      </CardTitle>
                      <CardDescription>Your strengths and weaknesses across 6 cognitive categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={testAssessment.error_classifications.map((c) => ({ ...c, fullMark: 100 }))}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="type" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                          <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                          <Radar dataKey="score" stroke="hsl(187,72%,53%)" fill="hsl(187,72%,53%)" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                        {testAssessment.error_classifications.map((c) => (
                          <div key={c.type} className="flex items-center gap-2 p-2 rounded bg-secondary/30">
                            <div className={`w-2 h-2 rounded-full ${
                              c.score >= 80 ? "bg-cognitive-good" : c.score >= 50 ? "bg-cognitive-moderate" : "bg-cognitive-critical"
                            }`} />
                            <span className="text-xs text-foreground">{c.type}</span>
                            <span className={`text-xs font-bold ml-auto ${
                              c.score >= 80 ? "text-cognitive-good" : c.score >= 50 ? "text-cognitive-moderate" : "text-cognitive-critical"
                            }`}>{c.score}%</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3 text-center">
                        ✓ These scores have been synced to your Cognitive Fingerprint radar chart
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Errors Found */}
                {testAssessment.errors_found.length > 0 && (
                  <Card className="glass border-border/50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-cognitive-risk" /> Specific Errors Found
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {testAssessment.errors_found.map((err, i) => (
                        <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">{err.category}</Badge>
                          </div>
                          <div className="text-sm text-foreground mt-1">
                            <LatexRenderer text={err.description} />
                          </div>
                          <div className="mt-2 p-2 rounded bg-cognitive-good/5 border border-cognitive-good/20">
                            <p className="text-xs text-muted-foreground mb-1">Correct approach:</p>
                            <div className="text-sm text-foreground">
                              <LatexRenderer text={err.correction} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Complete Solution in LaTeX */}
                {testAssessment.latex_solution && (
                  <Card className="glass border-border/50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" /> Complete Solution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground font-mono leading-relaxed">
                        <LatexRenderer text={testAssessment.latex_solution} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Next / Finish */}
                <div className="flex justify-center gap-3">
                  {testCurrentIdx < testQuestions.length - 1 ? (
                    <Button onClick={nextTestQuestion} className="gap-2">
                      Next Question <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button onClick={goBack} className="gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Finish Quiz
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => { setTestAssessment(null); setTestAnswer(""); setTestImageBase64(null); setTestImagePreview(null); setShowTestHint(false); }} className="gap-2">
                    <RotateCcw className="w-4 h-4" /> Try Again
                  </Button>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No questions available.</p>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: REPORT SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (quizState === "report") {
    const correct = answers.filter((a) => a.isCorrect).length;
    const total = answers.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    const radarData = sampleErrorReport.map((e) => ({ type: e.type, score: e.percentage, fullMark: 100 }));
    const barData = sampleErrorReport.map((e) => ({ name: e.type, count: e.count, severity: e.severity }));

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
              <div className="text-4xl font-bold text-foreground">{Math.round(answers.reduce((s, a) => s + a.timeSpent, 0) / 60)}m</div>
              <p className="text-sm text-muted-foreground mt-1">Total time spent</p>
            </CardContent>
          </Card>
        </div>

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
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} labelStyle={{ color: "hsl(var(--foreground))" }} />
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

        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Detailed Error Breakdown</CardTitle>
            <CardDescription>Classified by our ML error classifier model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sampleErrorReport.map((err) => (
                <div key={err.type} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <div className={`w-2 h-10 rounded-full ${err.severity === "high" ? "bg-cognitive-critical" : err.severity === "medium" ? "bg-cognitive-risk" : "bg-cognitive-good"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{err.type}</span>
                      <Badge variant={err.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">{err.severity}</Badge>
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
                      <span className="text-sm">{disciplineConfig[q.discipline]?.icon || "📚"}</span>
                      <span className="font-medium text-sm text-foreground">{q.topic}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Review: {q.relatedConcepts.join(", ")}</p>
                  </div>
                );
              })}
              {answers.filter(a => !a.isCorrect).length === 0 && (
                <p className="text-sm text-cognitive-good col-span-2">Perfect score! No areas need immediate review.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: STANDARD QUIZ (flashcard/working/open-ended)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No questions available for the selected topics.</p>
      </div>
    );
  }

  const cfg = disciplineConfig[currentQuestion.discipline] || { label: currentQuestion.discipline, icon: "📚", color: "", formatLabel: "" };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient-primary">Quiz Me</h1>
          <p className="text-sm text-muted-foreground mt-1">Question {currentIndex + 1} of {filteredQuestions.length}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">{cfg.icon} {cfg.label}</Badge>
          <Badge variant={diffBadgeVariant(currentQuestion.difficulty)}>{currentQuestion.difficulty}</Badge>
        </div>
      </div>
      <Progress value={progress} className="h-1.5" />

      <AnimatePresence mode="wait">
        <motion.div key={currentQuestion.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
          {currentQuestion.format === "flashcard" && (
            <div className="perspective-1000">
              <div onClick={() => setFlipped(!flipped)} className="cursor-pointer">
                <Card className={`glass border-border/50 min-h-[300px] flex items-center justify-center transition-all duration-500 ${flipped ? "bg-primary/5" : ""}`}>
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

          {currentQuestion.format === "working" && (
            <Card className="glass border-border/50">
              <CardHeader>
                <Badge variant="outline" className="text-[10px] font-mono w-fit">{currentQuestion.topic}</Badge>
                <CardTitle className="text-xl leading-relaxed">{currentQuestion.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea placeholder="Show your working here..." value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} className="min-h-[150px] font-mono text-sm bg-secondary/30" />
                <VoiceRecorder isRecording={isRecording} audioURL={audioURL} onStart={startRecordingMedia} onStop={stopRecordingMedia} />
                {currentQuestion.hints && (
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setShowHint(!showHint)} className="gap-2 text-muted-foreground">
                      <Lightbulb className="w-4 h-4" /> {showHint ? "Hide Hint" : "Show Hint"}
                    </Button>
                    {showHint && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 p-3 rounded-lg bg-cognitive-moderate/10 border border-cognitive-moderate/20">
                        {currentQuestion.hints.map((h, i) => <p key={i} className="text-sm text-foreground">💡 {h}</p>)}
                      </motion.div>
                    )}
                  </div>
                )}
                <div>
                  <Button variant="ghost" size="sm" onClick={() => setShowAnswer(!showAnswer)} className="gap-2 text-muted-foreground">
                    {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {showAnswer ? "Hide Solution" : "Reveal Solution"}
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

          {currentQuestion.format === "open-ended" && (
            <Card className="glass border-border/50">
              <CardHeader>
                <Badge variant="outline" className="text-[10px] font-mono w-fit">{currentQuestion.topic}</Badge>
                <CardTitle className="text-xl leading-relaxed">{currentQuestion.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-2">Write your answer or use voice recording below</p>
                  <Textarea placeholder="Type your response here..." value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} className="min-h-[120px] bg-transparent border-0 focus-visible:ring-0 p-0 text-sm" />
                </div>
                <VoiceRecorder isRecording={isRecording} audioURL={audioURL} onStart={startRecordingMedia} onStop={stopRecordingMedia} />
                {currentQuestion.hints && (
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setShowHint(!showHint)} className="gap-2 text-muted-foreground">
                      <Lightbulb className="w-4 h-4" /> {showHint ? "Hide Hints" : "Show Hints"}
                    </Button>
                    {showHint && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-3 rounded-lg bg-cognitive-moderate/10 border border-cognitive-moderate/20 space-y-1">
                        {currentQuestion.hints.map((h, i) => <p key={i} className="text-sm text-foreground">💡 {h}</p>)}
                      </motion.div>
                    )}
                  </div>
                )}
                <div>
                  <Button variant="ghost" size="sm" onClick={() => setShowAnswer(!showAnswer)} className="gap-2 text-muted-foreground">
                    {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {showAnswer ? "Hide Model Answer" : "Reveal Model Answer"}
                  </Button>
                  {showAnswer && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Model Answer</p>
                      <p className="text-sm text-foreground leading-relaxed">{currentQuestion.answer}</p>
                      <div className="mt-3 pt-3 border-t border-primary/10">
                        <p className="text-xs text-muted-foreground">Common errors to avoid:</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {currentQuestion.commonErrors.map((e, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] border-destructive/30 text-destructive">{e}</Badge>
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


// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

/** Voice mic + transcript area (shared between Teach Me and Question answer) */
function VoiceExplainArea({ isRecording, isLoading, transcript, interim, onStart, onStop }: {
  isRecording: boolean;
  isLoading: boolean;
  transcript: string;
  interim: string;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-6">
      {!getSpeechRecognition() && (
        <div className="mb-4 p-3 rounded-lg bg-cognitive-risk/10 border border-cognitive-risk/30 text-sm text-cognitive-risk">
          Speech recognition requires Chrome or Edge browser.
        </div>
      )}

      <motion.button
        onClick={isRecording ? onStop : onStart}
        disabled={isLoading}
        whileTap={{ scale: 0.95 }}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 ${
          isRecording
            ? "bg-cognitive-critical/20 border-2 border-cognitive-critical glow-risk"
            : "bg-primary/10 border-2 border-primary/30 hover:border-primary glow-primary"
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-8 h-8 text-cognitive-critical" />
        ) : (
          <Mic className="w-8 h-8 text-primary" />
        )}
      </motion.button>
      <p className="text-xs text-muted-foreground mt-3">
        {isRecording ? "Recording... click to stop & analyze" : isLoading ? "Analyzing your answer with AI..." : "Click to record your explanation"}
      </p>

      {isRecording && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex flex-col items-center gap-2">
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

      {/* Live transcript */}
      {(transcript || interim) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 w-full max-w-xl p-3 rounded-lg bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Your answer:</p>
          <p className="text-sm text-foreground">
            {transcript}
            {interim && <span className="text-muted-foreground italic"> {interim}</span>}
          </p>
        </motion.div>
      )}
    </div>
  );
}


/** AI analysis result display */
function AnalysisResult({ analysis, onTryAgain }: { analysis: VoiceAnalysisResult; onTryAgain: () => void }) {
  const accuracyColor = (acc: number) => acc >= 80 ? "text-cognitive-good" : acc >= 50 ? "text-cognitive-moderate" : "text-cognitive-critical";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Overall Score */}
      <Card className="glass border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> AI Analysis
            </CardTitle>
            <div className="text-right">
              <span className={`text-3xl font-bold ${accuracyColor(analysis.overall_accuracy)}`}>
                {analysis.overall_accuracy}%
              </span>
              <p className="text-xs text-muted-foreground">accuracy</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={analysis.overall_accuracy} className="h-2" />
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.feedback}</p>
        </CardContent>
      </Card>

      {/* Transcript */}
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

      {/* Sentence-by-sentence breakdown */}
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
                    <Badge variant="outline" className={`text-[10px] ${cfg.color} border-current`}>{cfg.label}</Badge>
                    <p className="text-sm text-foreground font-medium italic">&ldquo;{sentence.original}&rdquo;</p>
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
      {(analysis.strengths.length > 0 || analysis.weaknesses.length > 0) && (
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
                  <AlertTriangle className="w-4 h-4" /> Areas to Improve
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
      )}

      {/* Missing Concepts */}
      {analysis.missing_concepts.length > 0 && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cognitive-moderate" /> Concepts You Didn't Mention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.missing_concepts.map((concept, i) => (
                <Badge key={i} variant="outline" className="bg-cognitive-moderate/10 border-cognitive-moderate/30 text-cognitive-moderate">{concept}</Badge>
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
        <Button onClick={onTryAgain} variant="outline" className="gap-2">
          <Mic className="w-4 h-4" /> Try Again
        </Button>
      </div>
    </motion.div>
  );
}


/** Simple voice recorder for standard quiz mode */
function VoiceRecorder({ isRecording, audioURL, onStart, onStop }: {
  isRecording: boolean; audioURL: string | null; onStart: () => void; onStop: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/30">
      <Button variant={isRecording ? "destructive" : "outline"} size="sm" onClick={isRecording ? onStop : onStart} className="gap-2">
        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {isRecording ? "Stop Recording" : "Record Answer"}
      </Button>
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs text-destructive font-mono">Recording...</span>
        </div>
      )}
      {audioURL && !isRecording && <audio controls src={audioURL} className="h-8 flex-1" />}
      <span className="text-xs text-muted-foreground ml-auto">Voice input</span>
    </div>
  );
}
