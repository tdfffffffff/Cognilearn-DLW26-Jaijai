import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import CognitiveFingerprint from "./pages/CognitiveFingerprint";
import StudyBrief from "./pages/StudyBrief";
import QuizMe from "./pages/QuizMe";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import AttentionMonitor from "./pages/AttentionMonitor";
// TeachMe is now integrated into QuizMe
import MyData from "./pages/MyData";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WorkBreakCoachProvider } from "./context/WorkBreakCoachContext";
import { FatigueStreamProvider } from "./context/FatigueStreamContext";

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<CognitiveFingerprint />} />
        <Route path="/study-brief" element={<StudyBrief />} />
        <Route path="/quiz-me" element={<QuizMe />} />
        <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
        <Route path="/attention" element={<AttentionMonitor />} />
        {/* TeachMe is now part of Quiz Me → Practice Mode */}
        <Route path="/my-data" element={<MyData />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <WorkBreakCoachProvider>
            <FatigueStreamProvider>
              <AppRoutes />
            </FatigueStreamProvider>
          </WorkBreakCoachProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
