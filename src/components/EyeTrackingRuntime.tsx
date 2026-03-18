import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useTrackingMode } from "@/context/TrackingModeContext";
import GazeCursor from "./GazeCursor";

const DWELL_TIME_MS = 1200;
const CLICK_COOLDOWN_MS = 900;

const findClickableTarget = (element: Element | null): HTMLElement | null => {
  if (!element) return null;

  const target = (element as HTMLElement).closest(
    '[data-gaze-target], button, a, [role="button"], input, select, textarea, [onclick], .cursor-pointer'
  );

  if (!(target instanceof HTMLElement)) return null;
  if (target.dataset.gazeIgnore === "true") return null;
  if (target.hasAttribute("disabled")) return null;
  if (target.getAttribute("aria-disabled") === "true") return null;

  return target;
};

const getTargetId = (element: HTMLElement) => {
  if (element.dataset.gazeTarget) return element.dataset.gazeTarget;
  if (element.id) return `id:${element.id}`;

  const rect = element.getBoundingClientRect();
  return `${element.tagName}:${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
};

const EyeTrackingRuntime = () => {
  const { trackingMode } = useTrackingMode();

  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const smoothRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const activeTargetElementRef = useRef<HTMLElement | null>(null);
  const clickCooldownUntilRef = useRef<number>(0);

  const [cursorPos, setCursorPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isLoading, setIsLoading] = useState(false);
  const [hasDetectedFace, setHasDetectedFace] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [dwellTime, setDwellTime] = useState(0);

  useEffect(() => {
    if (trackingMode !== "camera") return;

    let isCancelled = false;

    const cleanupRuntime = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      activeTargetElementRef.current = null;
    };

    const startCameraRuntime = async () => {
      setErrorMsg(null);
      setIsLoading(true);
      setHasDetectedFace(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) throw new Error("Elemento de video nao disponivel.");

        streamRef.current = stream;

        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU",
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1,
        });

        if (isCancelled) {
          landmarker.close();
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        landmarkerRef.current = landmarker;

        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.muted = true;
        video.srcObject = stream;

        await video.play();
        if (isCancelled) return;

        setIsLoading(false);

        let lastVideoTime = -1;

        const loop = () => {
          if (isCancelled || !landmarkerRef.current || !videoRef.current) return;

          const activeVideo = videoRef.current;

          if (activeVideo.readyState >= 2 && activeVideo.currentTime !== lastVideoTime) {
            lastVideoTime = activeVideo.currentTime;
            const results = landmarkerRef.current.detectForVideo(activeVideo, performance.now());

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
              setHasDetectedFace(true);

              const nose = results.faceLandmarks[0][1];
              const sensitivityX = 5;
              const sensitivityY = 5;

              const amplifiedX = ((1 - nose.x) - 0.5) * sensitivityX + 0.5;
              const amplifiedY = (nose.y - 0.5) * sensitivityY + 0.5;

              const targetX = Math.max(0, Math.min(1, amplifiedX)) * window.innerWidth;
              const targetY = Math.max(0, Math.min(1, amplifiedY)) * window.innerHeight;

              smoothRef.current.x += (targetX - smoothRef.current.x) * 0.15;
              smoothRef.current.y += (targetY - smoothRef.current.y) * 0.15;

              setCursorPos({ x: smoothRef.current.x, y: smoothRef.current.y });

              const elementAtPoint = document.elementFromPoint(smoothRef.current.x, smoothRef.current.y);
              const clickableTarget = findClickableTarget(elementAtPoint);

              activeTargetElementRef.current = clickableTarget;
              setActiveTargetId(clickableTarget ? getTargetId(clickableTarget) : null);
            } else {
              setHasDetectedFace(false);
              activeTargetElementRef.current = null;
              setActiveTargetId(null);
            }
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao iniciar a camera.";
        setErrorMsg(message);
        setIsLoading(false);
        cleanupRuntime();
      }
    };

    startCameraRuntime();

    return () => {
      isCancelled = true;
      cleanupRuntime();
      setDwellTime(0);
      setActiveTargetId(null);
    };
  }, [trackingMode]);

  useEffect(() => {
    if (trackingMode !== "camera") return;
    if (!activeTargetId) {
      setDwellTime(0);
      return;
    }

    const interval = window.setInterval(() => {
      setDwellTime((prev) => {
        const next = prev + 50;

        if (next < DWELL_TIME_MS) return next;

        const now = Date.now();
        if (now < clickCooldownUntilRef.current) return prev;

        const target = activeTargetElementRef.current;
        if (target) {
          target.click();
          clickCooldownUntilRef.current = now + CLICK_COOLDOWN_MS;
        }

        return 0;
      });
    }, 50);

    return () => window.clearInterval(interval);
  }, [activeTargetId, trackingMode]);

  if (trackingMode === "mouse") {
    return <GazeCursor />;
  }

  if (trackingMode !== "camera") {
    return null;
  }

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width="480"
        height="640"
        style={{
          position: "absolute",
          top: "-10000px",
          left: "-10000px",
          width: "480px",
          height: "640px",
          pointerEvents: "none",
        }}
      />

      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[90] rounded-full bg-card/90 border border-border px-4 py-2 text-xs font-bold shadow-md backdrop-blur-sm">
        {errorMsg
          ? "Camera indisponivel"
          : isLoading
            ? "Iniciando eye tracking..."
            : hasDetectedFace
              ? "Eye tracking ativo"
              : "Posicione o rosto na camera"}
      </div>

      <div
        className="fixed w-7 h-7 rounded-full pointer-events-none z-[100] bg-primary/85 shadow-[0_0_18px_hsl(var(--primary)/0.45)]"
        style={{ left: cursorPos.x, top: cursorPos.y, transform: "translate(-50%, -50%)" }}
      >
        {activeTargetId && (
          <svg className="absolute -top-3 -left-3 w-14 h-14 -rotate-90">
            <circle cx="28" cy="28" r="20" fill="none" stroke="hsl(var(--primary) / 0.18)" strokeWidth="3" />
            <circle
              cx="28"
              cy="28"
              r="20"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeDasharray={`${(dwellTime / DWELL_TIME_MS) * 125} 125`}
            />
          </svg>
        )}
      </div>
    </>
  );
};

export default EyeTrackingRuntime;
