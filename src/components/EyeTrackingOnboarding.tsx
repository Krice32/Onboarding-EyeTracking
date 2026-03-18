import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import GazeCursor from "./GazeCursor";
import characterHappy from "@/assets/character-happy.png";
import characterThumbsup from "@/assets/character-thumbsup.png";
import type { TrackingMode } from "@/context/TrackingModeContext";

interface CalibrationDot {
  id: number;
  x: string;
  y: string;
}

interface Props {
  onComplete: (mode: TrackingMode) => void;
}

const CALIBRATION_DOTS: CalibrationDot[] = [
  { id: 0, x: "20%", y: "20%" },
  { id: 1, x: "80%", y: "20%" },
  { id: 2, x: "80%", y: "50%" },
  { id: 3, x: "80%", y: "80%" },
  { id: 4, x: "20%", y: "80%" },
  { id: 5, x: "20%", y: "50%" },
];

const DOT_DWELL = 1500;
const CARD_DWELL = 1200;
const BUTTON_DWELL = 1500;

const EyeTrackingOnboarding = ({ onComplete }: Props) => {
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
  const [isFinished, setIsFinished] = useState(false);
  const [hasDetectedFace, setHasDetectedFace] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);

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
    setIsFinished(true);
    stopCameraTracking();
    onComplete(trackingMode);
  }, [onComplete, stopCameraTracking, trackingMode]);

  const startCameraMode = async () => {
    stopCameraTracking();
    setIsInitializingCamera(true);
    setHasDetectedFace(false);
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

                const amplifiedX = ((1 - nose.x) - 0.5) * sensitivityX + 0.5;
                const amplifiedY = (nose.y - 0.5) * sensitivityY + 0.5;

                const targetX = Math.max(0, Math.min(1, amplifiedX)) * window.innerWidth;
                const targetY = Math.max(0, Math.min(1, amplifiedY)) * window.innerHeight;

                smoothRef.current.x += (targetX - smoothRef.current.x) * 0.15;
                smoothRef.current.y += (targetY - smoothRef.current.y) * 0.15;

                setCursorPos({ x: smoothRef.current.x, y: smoothRef.current.y });

                const targetElement = document
                  .elementFromPoint(smoothRef.current.x, smoothRef.current.y)
                  ?.closest("[data-target]")
                  ?.getAttribute("data-target");

                setLookingAt(targetElement || null);
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
      alert(`Erro na camera: ${message}`);
      setTrackingMode(null);
      setIsInitializingCamera(false);
      stopCameraTracking();
    }
  };

  const startMouseMode = () => {
    setTrackingMode("mouse");
    setStep(1);
  };

  useEffect(() => {
    return () => {
      stopCameraTracking();
    };
  }, [stopCameraTracking]);

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
    if (step === 0) return "Bem-vindo ao Matraquinha. Como deseja simular?";

    if (step === 1) {
      return trackingMode === "mouse"
        ? "Vamos calibrar. Passe o mouse na bolinha azul."
        : "Vamos calibrar. Fixe o olhar na bolinha azul.";
    }

    if (step === 2) {
      if (lockedCard !== null) return "Parabens, voce conseguiu! Olhe para 'Continuar' para prosseguir.";
      return trackingMode === "mouse"
        ? "Hora do teste! Deixe o mouse parado sobre um cartao."
        : "Hora do teste! Fixe o olhar em um dos cartoes.";
    }

    if (step === 3) return "Tudo pronto. Voce pode comecar a usar.";
    return "";
  };

  const renderAvatar = (avatarSrc: string) => (
    <div className="flex flex-col items-center justify-center z-10 pointer-events-none mb-6">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="bg-card px-5 py-3 rounded-2xl border-2 border-primary/20 shadow-lg text-center max-w-xs sm:max-w-sm relative mb-4"
      >
        <p className="text-sm sm:text-base font-bold text-foreground">{getAvatarMessage()}</p>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card rotate-45 border-r-2 border-b-2 border-primary/20" />
      </motion.div>
      <img src={avatarSrc} className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-md" alt="Avatar" />
    </div>
  );

  const demoCards = [
    { label: "GOSTEI", emoji: "\u{1F44D}" },
    { label: "QUERO", emoji: "\u{1F64B}" },
    { label: "BOM", emoji: "\u{1F60A}" },
    { label: "MAIS", emoji: "\u270B" },
  ];

  return (
    <div className={isFinished ? "pointer-events-none" : "fixed inset-0 z-40 bg-background overflow-hidden"}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width="480"
        height="640"
        style={{ position: "absolute", top: "-10000px", left: "-10000px", width: "480px", height: "640px", pointerEvents: "none" }}
      />

      {trackingMode !== "camera" && !isFinished && <GazeCursor />}

      {trackingMode === "camera" && step > 0 && hasDetectedFace && (
        <div
          className="fixed w-6 h-6 bg-primary/80 rounded-full pointer-events-none z-[100] shadow-[0_0_15px_rgba(var(--primary),0.8)]"
          style={{ left: cursorPos.x, top: cursorPos.y, transform: "translate(-50%, -50%)" }}
        />
      )}

      {!isFinished && (
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full px-6 text-center">
              {renderAvatar(characterHappy)}

              {isInitializingCamera ? (
                <p className="text-primary font-bold animate-pulse mt-4">{loadingMsg}</p>
              ) : (
                <div className="flex flex-col gap-4 mt-2 w-full max-w-xs">
                  <motion.button whileHover={{ scale: 1.03 }} className="px-8 py-4 rounded-2xl bg-secondary border-2 cursor-pointer font-bold w-full" onClick={startMouseMode}>
                    Usar Mouse (PC)
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} className="px-8 py-4 rounded-2xl bg-primary/10 border-2 border-primary/30 text-primary cursor-pointer font-bold w-full" onClick={startCameraMode}>
                    Usar Camera (Mobile)
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="calibration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative h-full flex flex-col items-center justify-center">
              {renderAvatar(characterHappy)}

              {CALIBRATION_DOTS.map((dot) => (
                <motion.div
                  key={dot.id}
                  className="absolute"
                  style={{ left: dot.x, top: dot.y, transform: "translate(-50%, -50%)" }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: dot.id === activeDot ? 1 : dotsCompleted.includes(dot.id) ? 0.3 : 0.15,
                    scale: dot.id === activeDot ? 1 : 0.6,
                  }}
                >
                  <div
                    data-target={`dot-${dot.id}`}
                    className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center cursor-pointer"
                    onMouseEnter={() => trackingMode === "mouse" && handleDotHover(dot.id)}
                    onMouseLeave={() => trackingMode === "mouse" && setIsHovering(false)}
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
                        if (trackingMode === "mouse" && lockedCard === null) setDemoCardActive(i);
                      }}
                      onMouseLeave={() => {
                        if (trackingMode === "mouse" && lockedCard === null) setDemoCardActive(null);
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
                onMouseEnter={() => trackingMode === "mouse" && lockedCard !== null && setTimeout(() => setStep(3), 800)}
              >
                <p className="text-primary font-bold">Continuar {"\u2192"}</p>
              </motion.div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center px-6">
              {renderAvatar(characterThumbsup)}

              <motion.div
                data-target="finish-btn"
                className="relative mt-4 px-10 py-4 bg-primary rounded-2xl border-2 border-transparent transition-all overflow-hidden cursor-pointer"
                onMouseEnter={() => {
                  if (trackingMode === "mouse") setLookingAt("finish-btn");
                }}
                onMouseLeave={() => {
                  if (trackingMode === "mouse") setLookingAt(null);
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

