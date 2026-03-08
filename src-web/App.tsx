import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DashboardLayout } from "./components/DashboardLayout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardHome from "./pages/DashboardHome";
import DocumentsPage from "./pages/DocumentsPage";
import ProfilePage from "./pages/ProfilePage";

const queryClient = new QueryClient();

export default function WebApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<DashboardLayout />}>
              <Route path="/overview" element={<DashboardHome />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            {/* Legacy redirects */}
            <Route path="/courses" element={<Navigate to="/overview" replace />} />
            <Route path="/dashboard/*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
