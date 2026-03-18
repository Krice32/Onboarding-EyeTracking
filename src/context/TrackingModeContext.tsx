import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

export type TrackingMode = "mouse" | "camera";

interface TrackingModeContextValue {
  trackingMode: TrackingMode | null;
  setTrackingMode: (mode: TrackingMode | null) => void;
}

const STORAGE_KEY = "matraquinha_tracking_mode";

const TrackingModeContext = createContext<TrackingModeContextValue | undefined>(undefined);

const readTrackingMode = (): TrackingMode | null => {
  if (typeof window === "undefined") return null;
  const storedMode = window.localStorage.getItem(STORAGE_KEY);
  if (storedMode === "mouse" || storedMode === "camera") return storedMode;
  return null;
};

export const TrackingModeProvider = ({ children }: { children: ReactNode }) => {
  const [trackingMode, setTrackingModeState] = useState<TrackingMode | null>(() => readTrackingMode());

  const setTrackingMode = useCallback((mode: TrackingMode | null) => {
    setTrackingModeState(mode);
    if (typeof window === "undefined") return;

    if (mode) {
      window.localStorage.setItem(STORAGE_KEY, mode);
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(() => ({ trackingMode, setTrackingMode }), [trackingMode, setTrackingMode]);

  return <TrackingModeContext.Provider value={value}>{children}</TrackingModeContext.Provider>;
};

export const useTrackingMode = () => {
  const context = useContext(TrackingModeContext);
  if (!context) {
    throw new Error("useTrackingMode must be used inside a TrackingModeProvider");
  }
  return context;
};
