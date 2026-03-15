import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import GazeCursor from "./GazeCursor";
import characterWave from "@/assets/character-wave.png";
import characterHappy from "@/assets/character-happy.png";
import characterThumbsup from "@/assets/character-thumbsup.png";

// AJUSTE 1: Posições mais seguras para não vazar no mobile
interface CalibrationDot { id: number; x: string; y: string; label: string; }
const CALIBRATION_DOTS: CalibrationDot[] = [
  { id: 0, x: "20%", y: "25%", label: "↖" },
  { id: 1, x: "80%", y: "25%", label: "↗" },
  { id: 2, x: "80%", y: "75%", label: "↘" },
  { id: 3, x: "20%", y: "75%", label: "↙" },
];

interface Props { onComplete: () => void; }

const EyeTrackingOnboarding = ({ onComplete }: Props) => {
  const [step, setStep] = useState(0);
  const [activeDot, setActiveDot] = useState(0);
  const [dotsCompleted, setDotsCompleted] = useState<number[]>([]);
  const [gazeTime, setGazeTime] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [demoCardActive, setDemoCardActive] = useState<number | null>(null);
  const [demoGazeTime, setDemoGazeTime] = useState(0);

  const [trackingMode, setTrackingMode] = useState<'mouse' | 'camera' | null>(null);
  const [lookingAt, setLookingAt] = useState<string | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [isFinished, setIsFinished] = useState(false);
  const [globalGazeTime, setGlobalGazeTime] = useState(0); 

  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>();
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  
  // Referência para o amortecedor matemático do cursor
  const smoothRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const startCameraMode = async () => {
    setIsInitializingCamera(true);
    setTrackingMode('camera');
    setLoadingMsg("Solicitando câmera...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setLoadingMsg("Baixando IA do Google...");
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
      
      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        outputFaceBlendshapes: false,
        runningMode: "VIDEO",
        numFaces: 1
      });

      setLoadingMsg("Tudo pronto!");
      setIsInitializingCamera(false);
      setStep(1);

      let lastVideoTime = -1;
      const renderLoop = () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          let startTimeMs = performance.now();
          if (lastVideoTime !== videoRef.current.currentTime) {
            lastVideoTime = videoRef.current.currentTime;
            const results = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);
            
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
              const landmarks = results.faceLandmarks[0];
              const nose = landmarks[1]; 
              
              const SENSIBILIDADE_X = 5.0; 
              const SENSIBILIDADE_Y = 5.0;
              const CENTRO_X = 0.5; 
              const CENTRO_Y = 0.5; 
              
              const rawX = 1 - nose.x; 
              const rawY = nose.y;

              const amplifyX = (rawX - CENTRO_X) * SENSIBILIDADE_X + 0.5;
              const amplifyY = (rawY - CENTRO_Y) * SENSIBILIDADE_Y + 0.5;

              // Coordenada "Bruta"
              const targetX = Math.max(0, Math.min(1, amplifyX)) * window.innerWidth;
              const targetY = Math.max(0, Math.min(1, amplifyY)) * window.innerHeight;

              // AJUSTE 2: A Mágica da Suavização (Amortecedor)
              // Ignora os tremores e faz o cursor deslizar macio para o alvo
              smoothRef.current.x += (targetX - smoothRef.current.x) * 0.15;
              smoothRef.current.y += (targetY - smoothRef.current.y) * 0.15;
              
              setCursorPos({ x: smoothRef.current.x, y: smoothRef.current.y });

              // Usa a coordenada suavizada para checar colisões
              const el = document.elementFromPoint(smoothRef.current.x, smoothRef.current.y);
              const target = el?.closest('[data-target]')?.getAttribute('data-target');
              setLookingAt(target || null);
            }
          }
        }
        requestRef.current = requestAnimationFrame(renderLoop);
      };
      
      requestRef.current = requestAnimationFrame(renderLoop);

    } catch (error: any) {
      console.error(error);
      alert(`Erro na câmera: ${error.message || error}`);
      setIsInitializingCamera(false);
      setTrackingMode(null);
    }
  };

  const startMouseMode = () => {
    setTrackingMode('mouse');
    setStep(1);
  };

  useEffect(() => {
    if (!isFinished || trackingMode !== 'camera' || !lookingAt) {
      setGlobalGazeTime(0);
      return;
    }
    const interval = setInterval(() => {
      setGlobalGazeTime((prev) => {
        if (prev >= 1500) { 
          const el = document.querySelector(`[data-target="${lookingAt}"]`) as HTMLElement;
          if (el) el.click();
          return 0; 
        }
        return prev + 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [lookingAt, isFinished, trackingMode]);

  useEffect(() => {
    if (trackingMode !== 'camera' || isFinished) return;
    if (step === 1) setIsHovering(lookingAt === `dot-${activeDot}`);
    if (step === 2) {
      if (lookingAt?.startsWith('card-')) setDemoCardActive(parseInt(lookingAt.split('-')[1]));
      else setDemoCardActive(null);
      if (lookingAt === 'continue-btn') setTimeout(() => setStep(3), 800);
    }
  }, [lookingAt, step, activeDot, trackingMode, isFinished]);

  useEffect(() => {
    if (step !== 1 || !isHovering) return setGazeTime(0);
    const interval = setInterval(() => {
      setGazeTime((prev) => {
        if (prev >= 1500) {
          setDotsCompleted((d) => [...d, activeDot]);
          if (activeDot < 3) setActiveDot((a) => a + 1);
          setIsHovering(false);
          return 0;
        }
        return prev + 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [step, isHovering, activeDot]);

  useEffect(() => {
    if (dotsCompleted.length === 4 && step === 1) setTimeout(() => setStep(2), 600);
  }, [dotsCompleted, step]);

  useEffect(() => {
    if (step !== 2 || demoCardActive === null) return setDemoGazeTime(0);
    const interval = setInterval(() => {
      setDemoGazeTime((prev) => (prev >= 1200 ? 1200 : prev + 50));
    }, 50);
    return () => clearInterval(interval);
  }, [step, demoCardActive]);

  const handleDotHover = useCallback((dotId: number) => {
    if (dotId === activeDot && !dotsCompleted.includes(dotId)) setIsHovering(true);
  }, [activeDot, dotsCompleted]);

  const demoCards = [{ label: "GOSTEI", emoji: "👍" }, { label: "QUERO", emoji: "🙋" }, { label: "BOM", emoji: "😊" }, { label: "MAIS", emoji: "✋" }];

  return (
    <div className={isFinished ? "pointer-events-none" : "fixed inset-0 z-40 bg-background overflow-hidden"}>
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {trackingMode !== 'camera' && !isFinished && <GazeCursor />}
      
      {trackingMode === 'camera' && step > 0 && (
        <div 
          className="fixed w-6 h-6 bg-primary/80 rounded-full pointer-events-none z-[100] shadow-[0_0_15px_rgba(var(--primary),0.8)] flex items-center justify-center transition-all duration-75"
          style={{ left: cursorPos.x, top: cursorPos.y, transform: 'translate(-50%, -50%)' }}
        >
          {isFinished && lookingAt && (
             <svg className="absolute w-12 h-12 -rotate-90">
               <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
                 strokeDasharray={`${(globalGazeTime / 1500) * 125} 125`} />
             </svg>
          )}
        </div>
      )}

      {!isFinished && (
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full px-6 text-center gap-6">
              <motion.img src={characterWave} className="w-40 h-40 object-contain" animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
              <h1 className="text-3xl font-extrabold text-foreground">Olá! 👋</h1>
              <p className="text-lg text-muted-foreground max-w-xs">Como você quer simular o uso do aplicativo hoje?</p>

              {isInitializingCamera ? (
                 <p className="text-primary font-bold animate-pulse mt-6 text-center max-w-xs">{loadingMsg}</p>
              ) : (
                <div className="flex flex-col gap-4 mt-4 w-full max-w-xs">
                  <button className="px-8 py-4 rounded-2xl bg-secondary border-2 cursor-pointer font-bold w-full" onClick={startMouseMode}>
                    🖱️ Usar Mouse (PC)
                  </button>
                  <button className="px-8 py-4 rounded-2xl bg-primary/10 border-2 border-primary/30 text-primary cursor-pointer font-bold w-full" onClick={startCameraMode}>
                    📷 Usar Câmera (Mobile)
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="calibration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative h-full">
              <div className="absolute top-12 left-0 right-0 text-center z-10">
                <p className="text-lg font-bold">Calibrando intenção...</p>
                <p className="text-sm text-muted-foreground mt-1">Aponte o {trackingMode === 'mouse' ? 'mouse' : 'rosto'} para o ponto azul 🔵</p>
              </div>
              {CALIBRATION_DOTS.map((dot) => (
                <motion.div key={dot.id} className="absolute" style={{ left: dot.x, top: dot.y, transform: "translate(-50%, -50%)" }}
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: dot.id === activeDot ? 1 : dotsCompleted.includes(dot.id) ? 0.3 : 0.15, scale: dot.id === activeDot ? 1 : 0.6 }}
                >
                  <div
                    data-target={`dot-${dot.id}`}
                    // AJUSTE 3: Pontos menores no mobile (w-14 h-14) para garantir que cabem na tela
                    className={`relative w-14 h-14 sm:w-24 sm:h-24 rounded-full flex items-center justify-center cursor-pointer`}
                    onMouseEnter={() => trackingMode === 'mouse' && handleDotHover(dot.id)}
                    onMouseLeave={() => trackingMode === 'mouse' && setIsHovering(false)}
                  >
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="50%" cy="50%" r="40%" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="3" />
                      {dot.id === activeDot && <circle cx="50%" cy="50%" r="40%" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${(gazeTime / 1500) * 251} 251`} />}
                    </svg>
                    <div className={`w-5 h-5 sm:w-8 sm:h-8 rounded-full ${dotsCompleted.includes(dot.id) ? "bg-primary" : dot.id === activeDot ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "bg-muted"}`} />
                  </div>
                </motion.div>
              ))}
              <motion.img src={characterHappy} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-28 h-28 object-contain" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 0.6, y: 0 }} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="demo" className="flex flex-col items-center justify-center h-full px-4 gap-6">
              <div className="text-center">
                <p className="text-lg font-bold">Agora tente!</p>
                <p className="text-sm text-muted-foreground">Mire em um cartão por 1 segundo 👀</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-sm px-2">
                {demoCards.map((card, i) => (
                  <motion.div
                    key={card.label}
                    data-target={`card-${i}`}
                    className={`relative bg-card rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-center gap-2 border-2 transition-all ${demoCardActive === i ? "border-primary scale-105" : "border-transparent"}`}
                    onMouseEnter={() => { if (trackingMode === 'mouse') setDemoCardActive(i); }}
                    onMouseLeave={() => { if (trackingMode === 'mouse') setDemoCardActive(null); }}
                  >
                    <span className="text-3xl sm:text-4xl">{card.emoji}</span>
                    <span className="text-xs sm:text-sm font-bold">{card.label}</span>
                    {demoCardActive === i && (
                      <motion.div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(demoGazeTime / 1200) * 100}%` }} />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>

              <motion.div
                data-target="continue-btn"
                className={`mt-4 px-8 py-3 rounded-2xl border-2 transition-all ${lookingAt === 'continue-btn' ? 'bg-primary/30 border-primary' : 'bg-primary/10 border-primary/30'}`}
                onMouseEnter={() => trackingMode === 'mouse' && setTimeout(() => setStep(3), 800)}
              >
                <p className="text-primary font-bold">Continuar →</p>
              </motion.div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="complete" className="flex flex-col items-center justify-center h-full text-center">
              <motion.img src={characterThumbsup} className="w-44 h-44 object-contain" animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} />
              <h2 className="text-2xl font-extrabold text-foreground mt-4">Tudo pronto! 🎉</h2>
              <button 
                onClick={() => {
                  setIsFinished(true); 
                  onComplete(); 
                }} 
                className="mt-8 px-10 py-4 bg-primary text-primary-foreground font-bold rounded-2xl"
              >
                Começar a usar! 🚀
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default EyeTrackingOnboarding;