import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import CognitiveFingerprint from "./pages/CognitiveFingerprint";
import StudyBrief from "./pages/StudyBrief";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import AttentionMonitor from "./pages/AttentionMonitor";
import TeachMeVoice from "./pages/TeachMeVoice";
import MyData from "./pages/MyData";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { AuthProvider, useAuth } from "./context/AuthContext";

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
        <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
        <Route path="/attention" element={<AttentionMonitor />} />
        <Route path="/teach-me" element={<TeachMeVoice />} />
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
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
