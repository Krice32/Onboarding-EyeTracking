import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

export type TrackingMode = "mouse" | "camera";

interface TrackingModeContextValue {
  trackingMode: TrackingMode | null;
  setTrackingMode: (mode: TrackingMode | null) => void;
  hasCalibratedEyeTracking: boolean;
  setHasCalibratedEyeTracking: (value: boolean) => void;
}

const STORAGE_KEY = "matraquinha_tracking_mode";
const CALIBRATION_STORAGE_KEY = "matraquinha_eye_tracking_calibrated";

const TrackingModeContext = createContext<TrackingModeContextValue | undefined>(undefined);

const readTrackingMode = (): TrackingMode | null => {
  if (typeof window === "undefined") return null;
  const storedMode = window.localStorage.getItem(STORAGE_KEY);
  if (storedMode === "mouse" || storedMode === "camera") return storedMode;
  return null;
};

const readCalibrationFlag = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CALIBRATION_STORAGE_KEY) === "true";
};

export const TrackingModeProvider = ({ children }: { children: ReactNode }) => {
  const [trackingMode, setTrackingModeState] = useState<TrackingMode | null>(() => readTrackingMode());
  const [hasCalibratedEyeTracking, setHasCalibratedEyeTrackingState] = useState<boolean>(() => readCalibrationFlag());

  const setTrackingMode = useCallback((mode: TrackingMode | null) => {
    setTrackingModeState(mode);
    if (typeof window === "undefined") return;

    if (mode) {
      window.localStorage.setItem(STORAGE_KEY, mode);
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setHasCalibratedEyeTracking = useCallback((value: boolean) => {
    setHasCalibratedEyeTrackingState(value);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CALIBRATION_STORAGE_KEY, value ? "true" : "false");
  }, []);

  const value = useMemo(
    () => ({ trackingMode, setTrackingMode, hasCalibratedEyeTracking, setHasCalibratedEyeTracking }),
    [hasCalibratedEyeTracking, setHasCalibratedEyeTracking, setTrackingMode, trackingMode]
  );

  return <TrackingModeContext.Provider value={value}>{children}</TrackingModeContext.Provider>;
};

export const useTrackingMode = () => {
  const context = useContext(TrackingModeContext);
  if (!context) {
    throw new Error("useTrackingMode must be used inside a TrackingModeProvider");
  }
  return context;
};
