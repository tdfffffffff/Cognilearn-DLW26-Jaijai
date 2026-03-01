import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, Sparkles, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sampleTranscription, extractedKeywords, ragExplanation } from "@/data/mockData";

const TeachMeVoice = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [transcription, setTranscription] = useState("");

  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);
      // Simulate processing
      setTimeout(() => {
        setTranscription(sampleTranscription);
        setIsProcessing(false);
        setShowResults(true);
      }, 2000);
    } else {
      setIsRecording(true);
      setShowResults(false);
      setTranscription("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Teach Me</h1>
        <p className="text-sm text-muted-foreground mt-1">Voice-powered learning with concept gap detection & RAG explanations</p>
      </div>

      {/* Mic Capture Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-8 flex flex-col items-center"
      >
        <p className="text-sm text-muted-foreground mb-6">
          {isRecording ? "Listening... Explain what you're trying to understand" : 
           isProcessing ? "Processing your speech..." : 
           "Press the mic and explain a concept you're struggling with"}
        </p>
        
        <motion.button
          onClick={handleRecord}
          whileTap={{ scale: 0.95 }}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
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
            className="mt-4 flex items-center gap-2"
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
            <span className="text-xs text-primary font-mono">Recording</span>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Transcription */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">Transcription</h2>
              <p className="text-sm text-muted-foreground leading-relaxed bg-card rounded-lg p-4 border border-border">
                {transcription}
              </p>
            </div>

            {/* Keyword Extraction + Concept Gaps */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">Keyword Extraction & Concept Gap Overlay</h2>
              <div className="flex flex-wrap gap-2">
                {extractedKeywords.map((kw, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                      kw.isGap
                        ? "bg-cognitive-risk/10 border-cognitive-risk/30 text-cognitive-risk"
                        : "bg-cognitive-good/10 border-cognitive-good/30 text-cognitive-good"
                    }`}
                  >
                    {kw.isGap && <AlertCircle className="w-3 h-3" />}
                    {kw.word}
                    <span className="font-mono text-[10px] opacity-60">{(kw.relevance * 100).toFixed(0)}%</span>
                  </motion.span>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-cognitive-risk" /> = detected concept gap
              </p>
            </div>

            {/* RAG Explanation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">RAG-Powered Explanation</h2>
              </div>
              <div className="bg-card rounded-lg p-5 border border-primary/20">
                <h3 className="text-base font-semibold text-foreground mb-3">{ragExplanation.title}</h3>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {ragExplanation.content}
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2">Related Concepts</p>
                  <div className="flex gap-2">
                    {ragExplanation.relatedConcepts.map((c, i) => (
                      <span key={i} className="px-2 py-1 rounded-md bg-secondary text-xs text-secondary-foreground">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Human Override */}
              <div className="mt-4 flex items-center gap-3">
                <Button variant="outline" size="sm" className="text-xs">
                  ✓ Helpful
                </Button>
                <Button variant="outline" size="sm" className="text-xs text-cognitive-risk border-cognitive-risk/20 hover:bg-cognitive-critical/10">
                  ✗ Mark Unhelpful
                </Button>
                <span className="text-[10px] text-muted-foreground ml-2">Human override · Maker-Checker validation</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeachMeVoice;
