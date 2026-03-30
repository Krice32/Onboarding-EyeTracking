import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TrackingModeProvider } from "@/context/TrackingModeContext";
import { TelemetryProvider } from "@/context/TelemetryContext";
import Index from "./pages/Index.tsx";
import CategoryDetail from "./pages/CategoryDetail.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TrackingModeProvider>
        <TelemetryProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename="/Onboarding-EyeTracking">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/categoria/:categoryId" element={<CategoryDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TelemetryProvider>
      </TrackingModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
