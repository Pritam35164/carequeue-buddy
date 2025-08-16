import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { AuthPage } from "./components/AuthPage";
import { AuthConfirm } from "./components/AuthConfirm";
import { PatientDashboard } from "./components/PatientDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import Index from "./pages/Index";

const queryClient = new QueryClient();

const AppContent = () => {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        session ? (
          <Navigate to="/dashboard" replace />
        ) : (
          <Index />
        )
      } />
      <Route path="/auth" element={
        session ? (
          <Navigate to="/dashboard" replace />
        ) : (
          <AuthPage />
        )
      } />
      <Route path="/auth/confirm" element={<AuthConfirm />} />
      <Route path="/dashboard" element={
        !session ? (
          <Navigate to="/auth" replace />
        ) : profile?.role === 'admin' ? (
          <AdminDashboard />
        ) : (
          <PatientDashboard />
        )
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
