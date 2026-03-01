import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

type Tab = "login" | "signup";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (tab === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
      } else {
        navigate("/");
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error);
      } else {
        setSuccess("Account created! Check your email to confirm, then sign in.");
        setTab("login");
        setPassword("");
      }
    }

    setSubmitting(false);
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 glow-primary mb-4">
            <Activity className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary">CogniLearn</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1 tracking-wider">
            COGNITIVE OS FOR STUDENTS
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 glow-primary">
          {/* Tab switcher */}
          <div className="flex bg-secondary/50 rounded-xl p-1 mb-8">
            {(["login", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors duration-200 capitalize ${
                  tab === t
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === t && (
                  <motion.div
                    layoutId="tab-pill"
                    className="absolute inset-0 bg-primary rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">
                  {t === "login" ? "Sign In" : "Sign Up"}
                </span>
              </button>
            ))}
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={tab}
              initial={{ opacity: 0, x: tab === "login" ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === "login" ? 12 : -12 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/80 text-sm">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-10 bg-secondary/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground/80 text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={tab === "signup" ? "Min. 6 characters" : "••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                    className="pl-10 bg-secondary/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-cognitive-excellent/10 border border-cognitive-excellent/20 text-cognitive-excellent text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5 glow-primary transition-all duration-200"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {submitting
                  ? "Please wait..."
                  : tab === "login"
                  ? "Sign In"
                  : "Create Account"}
              </Button>

              {/* Footer hint */}
              <p className="text-center text-muted-foreground text-xs">
                {tab === "login" ? (
                  <>
                    No account?{" "}
                    <button
                      type="button"
                      onClick={() => switchTab("signup")}
                      className="text-primary hover:underline"
                    >
                      Sign up free
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchTab("login")}
                      className="text-primary hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </motion.form>
          </AnimatePresence>
        </div>

        <p className="text-center text-muted-foreground/40 text-xs mt-6 font-mono">
          DLW 2026 · AI-powered study companion
        </p>
      </motion.div>
    </div>
  );
}
