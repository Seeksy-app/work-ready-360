import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import InterestProfiler from "./pages/InterestProfiler";
import InterestProfilerResults from "./pages/InterestProfilerResults";
import WorkImportance from "./pages/WorkImportance";
import WorkImportanceResults from "./pages/WorkImportanceResults";
import Resume from "./pages/Resume";
import Podcast from "./pages/Podcast";
import CareerExplorer from "./pages/CareerExplorer";
import KnowledgeBase from "./pages/KnowledgeBase";
import Admin from "./pages/Admin";
import AdminWip from "./pages/AdminWip";
import AdminWipSession from "./pages/AdminWipSession";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/assessment/interest" element={<InterestProfiler />} />
            <Route path="/assessment/interest/results" element={<InterestProfilerResults />} />
            <Route path="/assessment/work-importance" element={<WorkImportance />} />
            <Route path="/assessment/work-importance/results" element={<WorkImportanceResults />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/podcast" element={<Podcast />} />
            <Route path="/careers" element={<CareerExplorer />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/wip" element={<AdminWip />} />
            <Route path="/admin/wip/:sessionId" element={<AdminWipSession />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
