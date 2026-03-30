import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef } from "react";

type SessionMode = "camera" | "touch";

interface SessionMetrics {
  session_id: string;
  participant_code: string;
  started_at: string;
  calibration_started: boolean;
  calibration_completed: boolean;
  calibration_duration_ms: number | "";
  started_mode: SessionMode | "";
  task_completed: boolean;
  task_duration_ms: number | "";
  selection_errors_count: number;
  first_correct_selection_ms: number | "";
  migrated_to_touch: boolean;
  total_navigation_ms: number | "";
  abandoned_eye_tracking_before_end: boolean;
  used_eye_tracking_until_end: boolean;
}

interface SessionRuntimeState extends SessionMetrics {
  started_at_ms: number;
  current_mode: SessionMode;
  calibration_started_at_ms: number | null;
  task_started_at_ms: number | null;
  task_id: string | null;
  task_expected_label: string | null;
}

interface TelemetryContextValue {
  startSession: () => void;
  markCalibrationStarted: () => void;
  markCalibrationCompleted: (completed: boolean) => void;
  markNavigationStarted: (mode: SessionMode) => void;
  markModeChange: (nextMode: SessionMode) => void;
  startTask: (taskId: string, expectedLabel: string) => void;
  recordSelection: (selectedLabel: string) => void;
  finalizeSession: (reason?: string) => void;
}

const PARTICIPANT_STORAGE_KEY = "matraquinha_participant_code";
const WEB_APP_URL = (import.meta.env.VITE_ANALYTICS_WEB_APP_URL ?? "").trim();
const WEB_APP_TOKEN = (import.meta.env.VITE_ANALYTICS_TOKEN ?? "").trim();

const TelemetryContext = createContext<TelemetryContextValue | undefined>(undefined);

const createSessionId = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const readOrCreateParticipantCode = () => {
  if (typeof window === "undefined") return "P-LOCAL";

  const existing = window.localStorage.getItem(PARTICIPANT_STORAGE_KEY);
  if (existing) return existing;

  const generated = `P-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  window.localStorage.setItem(PARTICIPANT_STORAGE_KEY, generated);
  return generated;
};

const buildInitialState = (): SessionRuntimeState => {
  const now = Date.now();

  return {
    session_id: createSessionId(),
    participant_code: readOrCreateParticipantCode(),
    started_at: new Date(now).toISOString(),
    calibration_started: false,
    calibration_completed: false,
    calibration_duration_ms: "",
    started_mode: "",
    task_completed: false,
    task_duration_ms: "",
    selection_errors_count: 0,
    first_correct_selection_ms: "",
    migrated_to_touch: false,
    total_navigation_ms: "",
    abandoned_eye_tracking_before_end: false,
    used_eye_tracking_until_end: false,
    started_at_ms: now,
    current_mode: "touch",
    calibration_started_at_ms: null,
    task_started_at_ms: null,
    task_id: null,
    task_expected_label: null,
  };
};

const postSession = (session: SessionMetrics) => {
  if (!WEB_APP_URL || !WEB_APP_TOKEN) {
    console.warn("Analytics desativado: configure VITE_ANALYTICS_WEB_APP_URL e VITE_ANALYTICS_TOKEN.");
    return;
  }

  const payload = JSON.stringify({
    token: WEB_APP_TOKEN,
    session,
  });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const didSend = navigator.sendBeacon(WEB_APP_URL, blob);
    if (didSend) return;
  }

  void fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: payload,
    keepalive: true,
  }).catch((error) => {
    console.error("Falha ao enviar analytics:", error);
  });
};

export const TelemetryProvider = ({ children }: { children: ReactNode }) => {
  const sessionRef = useRef<SessionRuntimeState | null>(null);
  const finalizedRef = useRef(false);

  const ensureSession = useCallback(() => {
    if (sessionRef.current && !finalizedRef.current) return sessionRef.current;
    sessionRef.current = buildInitialState();
    finalizedRef.current = false;
    return sessionRef.current;
  }, []);

  const startSession = useCallback(() => {
    ensureSession();
  }, [ensureSession]);

  const markCalibrationStarted = useCallback(() => {
    const session = ensureSession();
    session.calibration_started = true;
    if (session.calibration_started_at_ms === null) {
      session.calibration_started_at_ms = Date.now();
    }
  }, [ensureSession]);

  const markCalibrationCompleted = useCallback((completed: boolean) => {
    const session = sessionRef.current;
    if (!session) return;

    if (!session.calibration_started) return;
    if (!completed) return;

    session.calibration_completed = true;

    if (session.calibration_started_at_ms !== null) {
      session.calibration_duration_ms = Date.now() - session.calibration_started_at_ms;
    }
  }, []);

  const markNavigationStarted = useCallback(
    (mode: SessionMode) => {
      const session = ensureSession();
      if (!session.started_mode) {
        session.started_mode = mode;
      }
      session.current_mode = mode;
    },
    [ensureSession]
  );

  const markModeChange = useCallback((nextMode: SessionMode) => {
    const session = sessionRef.current;
    if (!session || finalizedRef.current) return;

    const previousMode = session.current_mode;
    session.current_mode = nextMode;

    if (session.started_mode === "camera" && previousMode === "camera" && nextMode === "touch") {
      session.migrated_to_touch = true;
    }
  }, []);

  const startTask = useCallback(
    (taskId: string, expectedLabel: string) => {
      const session = ensureSession();
      if (session.task_started_at_ms !== null) return;

      session.task_id = taskId;
      session.task_expected_label = expectedLabel;
      session.task_started_at_ms = Date.now();
    },
    [ensureSession]
  );

  const recordSelection = useCallback((selectedLabel: string) => {
    const session = sessionRef.current;
    if (!session || finalizedRef.current) return;
    if (session.task_started_at_ms === null || session.task_completed) return;

    const expectedLabel = session.task_expected_label || selectedLabel;
    if (selectedLabel === expectedLabel) {
      const elapsed = Date.now() - session.task_started_at_ms;
      session.first_correct_selection_ms = elapsed;
      session.task_duration_ms = elapsed;
      session.task_completed = true;
      return;
    }

    session.selection_errors_count += 1;
  }, []);

  const finalizeSession = useCallback((reason = "manual") => {
    const session = sessionRef.current;
    if (!session || finalizedRef.current) return;

    session.total_navigation_ms = Date.now() - session.started_at_ms;

    if (!session.started_mode) {
      session.started_mode = session.current_mode;
    }

    if (session.started_mode === "camera") {
      const endedWithCamera = session.current_mode === "camera";
      session.abandoned_eye_tracking_before_end = !endedWithCamera;
      session.used_eye_tracking_until_end = endedWithCamera;
    }

    const payload: SessionMetrics = {
      session_id: session.session_id,
      participant_code: session.participant_code,
      started_at: session.started_at,
      calibration_started: session.calibration_started,
      calibration_completed: session.calibration_completed,
      calibration_duration_ms: session.calibration_duration_ms,
      started_mode: session.started_mode,
      task_completed: session.task_completed,
      task_duration_ms: session.task_duration_ms,
      selection_errors_count: session.selection_errors_count,
      first_correct_selection_ms: session.first_correct_selection_ms,
      migrated_to_touch: session.migrated_to_touch,
      total_navigation_ms: session.total_navigation_ms,
      abandoned_eye_tracking_before_end: session.abandoned_eye_tracking_before_end,
      used_eye_tracking_until_end: session.used_eye_tracking_until_end,
    };

    postSession(payload);
    finalizedRef.current = true;
    sessionRef.current = null;

    if (reason !== "pagehide") {
      console.info(`Sessao finalizada e enviada (${reason}).`);
    }
  }, []);

  useEffect(() => {
    const onPageHide = () => {
      finalizeSession("pagehide");
    };

    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [finalizeSession]);

  return (
    <TelemetryContext.Provider
      value={{
        startSession,
        markCalibrationStarted,
        markCalibrationCompleted,
        markNavigationStarted,
        markModeChange,
        startTask,
        recordSelection,
        finalizeSession,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error("useTelemetry must be used inside a TelemetryProvider");
  }
  return context;
};


