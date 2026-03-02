import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { SourcePickerModal } from "@/components/SourcePickerModal";
import { ConsentModal } from "@/components/ConsentModal";
import Home from "./pages/Home";
import Session from "./pages/Session";
import History from "./pages/History";
import Courses from "./pages/Courses";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/session" element={<Session />} />
            <Route path="/history" element={<History />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SourcePickerModal />
        <ConsentModal />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
