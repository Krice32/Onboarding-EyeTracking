import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import characterHappy from "@/assets/character-happy.png";
import characterThumbsup from "@/assets/character-thumbsup.png";
import type { TrackingMode } from "@/context/TrackingModeContext";
import { useTelemetry } from "@/context/TelemetryContext";

interface CalibrationDot {
  id: number;
  xRatio: number;
  yRatio: number;
}

interface Props {
  onComplete: (mode: TrackingMode | null) => void;
}

const CALIBRATION_DOTS: CalibrationDot[] = [
  { id: 0, xRatio: 0, yRatio: 0 },
  { id: 1, xRatio: 1, yRatio: 0 },
  { id: 2, xRatio: 1, yRatio: 0.5 },
  { id: 3, xRatio: 1, yRatio: 1 },
  { id: 4, xRatio: 0, yRatio: 1 },
  { id: 5, xRatio: 0, yRatio: 0.5 },
];

const DOT_DWELL = 1500;
const CARD_DWELL = 1200;
const BUTTON_DWELL = 1500;

const EyeTrackingOnboarding = ({ onComplete }: Props) => {
  const { startSession, markCalibrationStarted, markCalibrationCompleted, markNavigationStarted } = useTelemetry();
  const [step, setStep] = useState(0);
  const [activeDot, setActiveDot] = useState(0);
  const [dotsCompleted, setDotsCompleted] = useState<number[]>([]);
  const [gazeTime, setGazeTime] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const [demoCardActive, setDemoCardActive] = useState<number | null>(null);
  const [demoGazeTime, setDemoGazeTime] = useState(0);
  const [lockedCard, setLockedCard] = useState<number | null>(null);
  const [finishGazeTime, setFinishGazeTime] = useState(0);

  const [trackingMode, setTrackingMode] = useState<TrackingMode | null>(null);
  const [lookingAt, setLookingAt] = useState<string | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [hasDetectedFace, setHasDetectedFace] = useState(false);
  const [precisionScore, setPrecisionScore] = useState<number | null>(null);
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const stepRef = useRef(0);
  const activeDotRef = useRef(0);
  const precisionSamplesRef = useRef<number[]>([]);

  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const smoothRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const stopCameraTracking = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = undefined;
    }

    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close();
      faceLandmarkerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadeddata = null;
    }
  }, []);

  const completeOnboarding = useCallback(() => {
    if (!trackingMode) return;
    markCalibrationCompleted(true);
    setIsFinished(true);
    stopCameraTracking();
    onComplete(trackingMode);
  }, [markCalibrationCompleted, onComplete, stopCameraTracking, trackingMode]);

  const skipCalibration = useCallback(() => {
    if (trackingMode === "camera") {
      markCalibrationCompleted(false);
    }

    setIsFinished(true);
    stopCameraTracking();
    onComplete(null);
  }, [markCalibrationCompleted, onComplete, stopCameraTracking, trackingMode]);

  const startCameraMode = useCallback(async () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
      const primer = new SpeechSynthesisUtterance("ok");
      primer.lang = "pt-BR";
      primer.volume = 0;
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(primer);
    }

    startSession();
    stopCameraTracking();
    setIsInitializingCamera(true);
    setCameraError(null);
    setHasDetectedFace(false);
    setPrecisionScore(null);
    precisionSamplesRef.current = [];
    setStep(0);
    setTrackingMode("camera");
    setLoadingMsg("Solicitando permissao da camera...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Elemento de video nao encontrado");

      setLoadingMsg("Carregando modelo de rastreamento...");
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");

      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "CPU",
        },
        outputFaceBlendshapes: false,
        runningMode: "VIDEO",
        numFaces: 1,
      });
      faceLandmarkerRef.current = faceLandmarker;

      setLoadingMsg("Ligando camera...");
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;

      video.onloadeddata = async () => {
        try {
          await video.play();
          setIsInitializingCamera(false);
          setStep(1);
          markNavigationStarted("camera");
          markCalibrationStarted();

          let lastVideoTime = -1;
          const loop = () => {
            if (!faceLandmarkerRef.current) return;

            if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
              lastVideoTime = video.currentTime;
              const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());

              if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                setHasDetectedFace(true);

                const nose = results.faceLandmarks[0][1];
                const sensitivityX = 5;
                const sensitivityY = 5;
                const cursorSafeMargin = 18;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const availableWidth = Math.max(1, viewportWidth - cursorSafeMargin * 2);
                const availableHeight = Math.max(1, viewportHeight - cursorSafeMargin * 2);

                const amplifiedX = ((1 - nose.x) - 0.5) * sensitivityX + 0.5;
                const amplifiedY = (nose.y - 0.5) * sensitivityY + 0.5;

                const targetX = cursorSafeMargin + Math.max(0, Math.min(1, amplifiedX)) * availableWidth;
                const targetY = cursorSafeMargin + Math.max(0, Math.min(1, amplifiedY)) * availableHeight;

                smoothRef.current.x += (targetX - smoothRef.current.x) * 0.15;
                smoothRef.current.y += (targetY - smoothRef.current.y) * 0.15;

                setCursorPos({ x: smoothRef.current.x, y: smoothRef.current.y });

                const targetElement = document
                  .elementFromPoint(smoothRef.current.x, smoothRef.current.y)
                  ?.closest("[data-target]")
                  ?.getAttribute("data-target");

                setLookingAt(targetElement || null);

                if (stepRef.current === 1 && targetElement === `dot-${activeDotRef.current}`) {
                  const dot = CALIBRATION_DOTS[activeDotRef.current];
                  if (dot) {
                    const horizontalPadding = Math.max(48, viewportWidth * 0.14);
                    const verticalPadding = Math.max(90, viewportHeight * 0.12);
                    const usableWidth = Math.max(1, viewportWidth - horizontalPadding * 2);
                    const usableHeight = Math.max(1, viewportHeight - verticalPadding * 2);
                    const dotX = horizontalPadding + usableWidth * dot.xRatio;
                    const dotY = verticalPadding + usableHeight * dot.yRatio;
                    const distance = Math.hypot(smoothRef.current.x - dotX, smoothRef.current.y - dotY);
                    const normalizedDistance = Math.min(1, distance / (Math.hypot(viewportWidth, viewportHeight) * 0.22));
                    precisionSamplesRef.current.push(normalizedDistance);
                  }
                }
              } else {
                setHasDetectedFace(false);
                setLookingAt(null);
              }
            }

            requestRef.current = requestAnimationFrame(loop);
          };

          requestRef.current = requestAnimationFrame(loop);
        } catch (error) {
          console.error("Erro ao iniciar video:", error);
        }
      };

      video.srcObject = stream;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCameraError(message);
      setLoadingMsg("Falha ao iniciar a camera.");
      setTrackingMode(null);
      setIsInitializingCamera(false);
      stopCameraTracking();
    }
  }, [markCalibrationStarted, markNavigationStarted, startSession, stopCameraTracking]);

  useEffect(() => {
    return () => {
      stopCameraTracking();
    };
  }, [stopCameraTracking]);

  useEffect(() => {
    const syncViewport = () => {
      const visualViewport = window.visualViewport;
      setViewport({
        width: Math.round(visualViewport?.width ?? window.innerWidth),
        height: Math.round(visualViewport?.height ?? window.innerHeight),
      });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    activeDotRef.current = activeDot;
  }, [activeDot]);

  useEffect(() => {
    if (trackingMode !== "camera" || isFinished) return;

    if (step === 1) {
      setIsHovering(lookingAt === `dot-${activeDot}`);
    }

    if (step === 2) {
      if (lookingAt?.startsWith("card-") && lockedCard === null) {
        setDemoCardActive(Number(lookingAt.split("-")[1]));
      } else if (lockedCard === null) {
        setDemoCardActive(null);
      }

      if (lookingAt === "continue-btn" && lockedCard !== null) {
        const timeout = window.setTimeout(() => setStep(3), 800);
        return () => window.clearTimeout(timeout);
      }
    }
  }, [activeDot, isFinished, lockedCard, lookingAt, step, trackingMode]);

  useEffect(() => {
    if (step !== 1 || !isHovering) {
      setGazeTime(0);
      return;
    }

    const interval = window.setInterval(() => {
      setGazeTime((prev) => {
        if (prev >= DOT_DWELL) {
          setDotsCompleted((current) => [...current, activeDot]);
          if (activeDot < CALIBRATION_DOTS.length - 1) {
            setActiveDot((current) => current + 1);
          }
          setIsHovering(false);
          return 0;
        }
        return prev + 50;
      });
    }, 50);

    return () => window.clearInterval(interval);
  }, [activeDot, isHovering, step]);

  useEffect(() => {
    if (dotsCompleted.length === CALIBRATION_DOTS.length && step === 1) {
      const samples = precisionSamplesRef.current;
      if (samples.length > 0) {
        const avgDistance = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        const score = Math.max(0, Math.min(100, Math.round((1 - avgDistance) * 100)));
        setPrecisionScore(score);
      } else {
        setPrecisionScore(null);
      }

      const timeout = window.setTimeout(() => setStep(2), 600);
      return () => window.clearTimeout(timeout);
    }
  }, [dotsCompleted, step]);

  useEffect(() => {
    if (step !== 2 || demoCardActive === null || lockedCard !== null) {
      setDemoGazeTime(0);
      return;
    }

    const interval = window.setInterval(() => {
      setDemoGazeTime((prev) => {
        if (prev >= CARD_DWELL) {
          setLockedCard(demoCardActive);
          return CARD_DWELL;
        }
        return prev + 50;
      });
    }, 50);

    return () => window.clearInterval(interval);
  }, [demoCardActive, lockedCard, step]);

  useEffect(() => {
    if (step !== 3 || lookingAt !== "finish-btn") {
      setFinishGazeTime(0);
      return;
    }

    const interval = window.setInterval(() => {
      setFinishGazeTime((prev) => {
        if (prev >= BUTTON_DWELL) {
          completeOnboarding();
          return BUTTON_DWELL;
        }
        return prev + 50;
      });
    }, 50);

    return () => window.clearInterval(interval);
  }, [completeOnboarding, lookingAt, step]);

  const handleDotHover = useCallback(
    (dotId: number) => {
      if (dotId === activeDot && !dotsCompleted.includes(dotId)) {
        setIsHovering(true);
      }
    },
    [activeDot, dotsCompleted]
  );

  const getAvatarMessage = () => {
    if (step === 0) {
      if (cameraError) return "Nao foi possivel abrir a camera. Voce pode tentar novamente ou continuar sem calibracao.";
      if (isInitializingCamera) return "Estamos preparando o teste com camera. Permita o acesso para continuar.";
      return "Este prototipo testa acessibilidade por olhar para apoiar a comunicacao.";
    }

    if (step === 1) {
      if (!hasDetectedFace) return "Ainda nao vimos seu rosto. Aproxime um pouco o celular e ajuste a luz.";
      return "Siga a bolinha azul e segure o olhar ate completar o anel.";
    }

    if (step === 2) {
      if (lockedCard !== null) return "Perfeito! Agora olhe para 'Continuar' para ir ao ultimo passo.";
      return "Teste rapido: fixe o olhar em um cartao ate aparecer o check verde.";
    }

    if (step === 3) return "Tudo pronto. Voce pode comecar a usar.";
    return "";
  };

  const getPrecisionSummary = () => {
    if (precisionScore === null) return null;
    if (precisionScore >= 85) return "Excelente alinhamento do olhar.";
    if (precisionScore >= 70) return "Boa precisao para continuar o teste.";
    return "Precisao moderada. Vale repetir com melhor luz para testar.";
  };

  const renderAvatar = (avatarSrc: string) => (
    <div className="w-full max-w-[22rem] flex flex-col items-center justify-center z-10 pointer-events-none mb-4 sm:mb-6">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full bg-card px-4 sm:px-5 py-3 rounded-2xl border-2 border-primary/20 shadow-lg text-center max-w-[calc(100vw-2rem)] sm:max-w-sm relative mb-4"
      >
        <p className="text-sm sm:text-base leading-snug font-bold text-foreground">{getAvatarMessage()}</p>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card rotate-45 border-r-2 border-b-2 border-primary/20" />
      </motion.div>
      <img src={avatarSrc} className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-md" alt="Avatar" />
    </div>
  );

  const positionedDots = useMemo(() => {
    const horizontalPadding = Math.max(48, viewport.width * 0.14);
    const verticalPadding = Math.max(90, viewport.height * 0.12);
    const usableWidth = Math.max(1, viewport.width - horizontalPadding * 2);
    const usableHeight = Math.max(1, viewport.height - verticalPadding * 2);

    return CALIBRATION_DOTS.map((dot) => ({
      id: dot.id,
      x: horizontalPadding + usableWidth * dot.xRatio,
      y: verticalPadding + usableHeight * dot.yRatio,
    }));
  }, [viewport.height, viewport.width]);

  const demoCards = [
    { label: "GOSTEI", emoji: "\u{1F44D}" },
    { label: "QUERO", emoji: "\u{1F64B}" },
    { label: "BOM", emoji: "\u{1F60A}" },
    { label: "MAIS", emoji: "\u270B" },
  ];

  return (
    <div className={isFinished ? "pointer-events-none" : "fixed inset-0 z-40 bg-background overflow-hidden h-[100dvh]"}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width="480"
        height="640"
        style={{ position: "absolute", top: "-10000px", left: "-10000px", width: "480px", height: "640px", pointerEvents: "none" }}
      />

      {trackingMode === "camera" && step > 0 && hasDetectedFace && (
        <div
          className="fixed w-7 h-7 rounded-full pointer-events-none z-[100] border-2 border-slate-900/80 bg-lime-300 shadow-[0_0_0_3px_rgba(255,255,255,0.55),0_0_20px_rgba(163,230,53,0.95)]"
          style={{ left: cursorPos.x, top: cursorPos.y, transform: "translate(-50%, -50%)" }}
        />
      )}

      {!isFinished && (
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full px-4 sm:px-6 text-center">
              {renderAvatar(characterHappy)}

              <div className="w-full max-w-sm space-y-3">
                <div className="rounded-2xl border border-primary/20 bg-card/95 px-4 py-3 text-left text-sm text-foreground shadow-sm">
                  <p className="font-extrabold text-primary mb-1">Sobre este prototipo</p>
                  <p>1. Estamos testando navegacao por olhar para acessibilidade.</p>
                  <p>2. A camera e usada somente para estimar para onde voce olha.</p>
                  <p>3. Nao gravamos nem enviamos video durante este teste.</p>
                  <p>4. O objetivo e validar se o fluxo fica claro e facil de usar.</p>
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-left text-xs sm:text-sm text-foreground">
                  <p className="font-bold text-primary mb-1">Antes de liberar a camera</p>
                  <p>- Posicione o rosto no centro e com boa luz.</p>
                  <p>- Segure o celular na altura dos olhos.</p>
                  <p>- Depois, siga a bolinha azul durante a calibracao.</p>
                </div>

                {isInitializingCamera ? (
                  <p className="text-primary font-bold animate-pulse mt-1">{loadingMsg}</p>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-extrabold shadow-lg"
                    onClick={() => void startCameraMode()}
                  >
                    Entendi, iniciar com camera (recomendado)
                  </motion.button>
                )}

                {!isInitializingCamera && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-6 py-3 rounded-2xl border-2 border-primary/30 bg-card text-primary font-extrabold shadow-sm"
                    onClick={skipCalibration}
                  >
                    Continuar sem calibracao (mouse/touch)
                  </motion.button>
                )}

                {cameraError && <p className="text-sm text-destructive font-bold">{cameraError}</p>}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="calibration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative h-full flex flex-col items-center justify-center">
              {renderAvatar(characterHappy)}

              {positionedDots.map((dot) => (
                <motion.div
                  key={dot.id}
                  className="absolute"
                  style={{ left: `${dot.x}px`, top: `${dot.y}px`, transform: "translate(-50%, -50%)" }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: dot.id === activeDot ? 1 : dotsCompleted.includes(dot.id) ? 0.3 : 0.15,
                    scale: dot.id === activeDot ? 1 : 0.6,
                  }}
                >
                  <div
                    data-target={`dot-${dot.id}`}
                    className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center cursor-pointer"
                    onMouseEnter={() => handleDotHover(dot.id)}
                    onMouseLeave={() => setIsHovering(false)}
                  >
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="50%" cy="50%" r="40%" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="3" />
                      {dot.id === activeDot && (
                        <circle cx="50%" cy="50%" r="40%" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${(gazeTime / DOT_DWELL) * 251} 251`} />
                      )}
                    </svg>
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${
                        dotsCompleted.includes(dot.id)
                          ? "bg-primary"
                          : dot.id === activeDot
                            ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            : "bg-muted"
                      }`}
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full px-4 gap-4">
              {renderAvatar(characterHappy)}

              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-sm px-2">
                {demoCards.map((card, i) => {
                  const isLocked = lockedCard === i;
                  const isActive = demoCardActive === i && lockedCard === null;

                  return (
                    <motion.div
                      key={card.label}
                      data-target={`card-${i}`}
                      className={`relative bg-card rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 border-2 transition-all duration-300 ${
                        isLocked ? "border-green-500 bg-green-50 scale-105" : isActive ? "border-primary scale-105" : "border-transparent"
                      }`}
                      onMouseEnter={() => {
                        if (lockedCard === null) setDemoCardActive(i);
                      }}
                      onMouseLeave={() => {
                        if (lockedCard === null) setDemoCardActive(null);
                      }}
                    >
                      <span className="text-3xl sm:text-4xl">{card.emoji}</span>
                      <span className="text-xs sm:text-sm font-bold">{card.label}</span>

                      {isActive && !isLocked && (
                        <motion.div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(demoGazeTime / CARD_DWELL) * 100}%` }} />
                        </motion.div>
                      )}

                      {isLocked && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-green-500 w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white text-xs font-bold">{"\u2713"}</span>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                data-target="continue-btn"
                className={`mt-2 px-8 py-3 rounded-2xl border-2 transition-all ${
                  lockedCard !== null ? "opacity-100 cursor-pointer" : "opacity-40 pointer-events-none"
                } ${lookingAt === "continue-btn" ? "bg-primary/30 border-primary" : "bg-primary/10 border-primary/30"}`}
                onMouseEnter={() => lockedCard !== null && setTimeout(() => setStep(3), 800)}
              >
                <p className="text-primary font-bold">Continuar {"\u2192"}</p>
              </motion.div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center px-6">
              {renderAvatar(characterThumbsup)}

              {precisionScore !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-sm rounded-2xl border border-primary/25 bg-card px-4 py-3 shadow-sm"
                >
                  <p className="text-xs font-extrabold uppercase tracking-wider text-primary">Nota de precisao</p>
                  <p className="mt-1 text-3xl font-black text-foreground">{precisionScore}/100</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{getPrecisionSummary()}</p>
                </motion.div>
              )}

              <motion.div
                data-target="finish-btn"
                className="relative mt-4 px-10 py-4 bg-primary rounded-2xl border-2 border-transparent transition-all overflow-hidden cursor-pointer"
                onMouseEnter={() => {
                  setLookingAt("finish-btn");
                }}
                onMouseLeave={() => {
                  setLookingAt(null);
                }}
                onClick={completeOnboarding}
              >
                <p className="text-primary-foreground font-bold text-lg relative z-10">Comecar a usar</p>
                {lookingAt === "finish-btn" && (
                  <div className="absolute top-0 left-0 h-full bg-black/20 z-0 transition-all duration-75" style={{ width: `${(finishGazeTime / BUTTON_DWELL) * 100}%` }} />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default EyeTrackingOnboarding;
