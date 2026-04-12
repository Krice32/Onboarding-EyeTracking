import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PrivacyConsentBanner from "@/components/PrivacyConsentBanner";
import { TrackingModeProvider } from "@/context/TrackingModeContext";
import { PrivacyConsentProvider } from "@/context/PrivacyConsentContext";
import { TelemetryProvider } from "@/context/TelemetryContext";
import Index from "./pages/Index.tsx";
import CategoryDetail from "./pages/CategoryDetail.tsx";
import Explore from "./pages/Explore.tsx";
import ColorChallenge from "./pages/ColorChallenge.tsx";
import PrivacyNotice from "./pages/PrivacyNotice.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TrackingModeProvider>
        <PrivacyConsentProvider>
          <TelemetryProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter basename="/Onboarding-EyeTracking">
              <PrivacyConsentBanner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/categoria/:categoryId" element={<CategoryDetail />} />
                <Route path="/explorar" element={<Explore />} />
                <Route path="/desafio/cores" element={<ColorChallenge />} />
                <Route path="/privacidade" element={<PrivacyNotice />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TelemetryProvider>
        </PrivacyConsentProvider>
      </TrackingModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
