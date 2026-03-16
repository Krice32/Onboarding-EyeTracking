import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import GazeCursor from "./GazeCursor";
import characterWave from "@/assets/character-wave.png";
import characterHappy from "@/assets/character-happy.png";
import characterThumbsup from "@/assets/character-thumbsup.png";

interface CalibrationDot { id: number; x: string; y: string; label: string; }

// NOVO: Circuito de 6 pontos (Cima, Meio e Baixo)
// O código agora é dinâmico, você pode adicionar ou remover pontos à vontade aqui!
const CALIBRATION_DOTS: CalibrationDot[] = [
  { id: 0, x: "20%", y: "20%", label: "Topo-Esq" },
  { id: 1, x: "80%", y: "20%", label: "Topo-Dir" },
  { id: 2, x: "80%", y: "50%", label: "Meio-Dir" },
  { id: 3, x: "80%", y: "80%", label: "Base-Dir" },
  { id: 4, x: "20%", y: "80%", label: "Base-Esq" },
  { id: 5, x: "20%", y: "50%", label: "Meio-Esq" },
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
  const [lockedCard, setLockedCard] = useState<number | null>(null); 

  const [finishGazeTime, setFinishGazeTime] = useState(0);

  const [trackingMode, setTrackingMode] = useState<'mouse' | 'camera' | null>(null);
  const [lookingAt, setLookingAt] = useState<string | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [isFinished, setIsFinished] = useState(false);
  const [globalGazeTime, setGlobalGazeTime] = useState(0); 
  const [hasDetectedFace, setHasDetectedFace] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>();
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const smoothRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const startCameraMode = async () => {
    setIsInitializingCamera(true);
    setTrackingMode('camera');
    setLoadingMsg("Solicitando permissão no dispositivo...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      const video = videoRef.current;
      if (!video) throw new Error("Elemento de vídeo não encontrado");
      
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;

      setLoadingMsg("Baixando IA de Rastreamento...");
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
      
      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "CPU" 
        },
        outputFaceBlendshapes: false,
        runningMode: "VIDEO",
        numFaces: 1
      });

      setLoadingMsg("Ligando a câmera...");

      video.onloadeddata = async () => {
        try {
          await video.play();
          setIsInitializingCamera(false);
          setStep(1);

          let lastVideoTime = -1;
          const renderLoop = () => {
            if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
              lastVideoTime = video.currentTime;
              const results = faceLandmarker.detectForVideo(video, performance.now());
              
              if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                setHasDetectedFace(true);
                const nose = results.faceLandmarks[0][1]; 
                
                const SENSIBILIDADE_X = 5.0; 
                const SENSIBILIDADE_Y = 5.0;
                const amplifyX = ((1 - nose.x) - 0.5) * SENSIBILIDADE_X + 0.5;
                const amplifyY = (nose.y - 0.5) * SENSIBILIDADE_Y + 0.5;

                const targetX = Math.max(0, Math.min(1, amplifyX)) * window.innerWidth;
                const targetY = Math.max(0, Math.min(1, amplifyY)) * window.innerHeight;

                smoothRef.current.x += (targetX - smoothRef.current.x) * 0.15;
                smoothRef.current.y += (targetY - smoothRef.current.y) * 0.15;
                
                setCursorPos({ x: smoothRef.current.x, y: smoothRef.current.y });

                const el = document.elementFromPoint(smoothRef.current.x, smoothRef.current.y);
                const target = el?.closest('[data-target]')?.getAttribute('data-target');
                setLookingAt(target || null);
              }
            }
            requestRef.current = requestAnimationFrame(renderLoop);
          };
          renderLoop();
        } catch (e) {
          console.error("Erro no play do vídeo:", e);
        }
      };
    } catch (error: any) {
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
    if (!isFinished || trackingMode !== 'camera' || !lookingAt) return setGlobalGazeTime(0);
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
      if (lookingAt?.startsWith('card-') && lockedCard === null) {
        setDemoCardActive(parseInt(lookingAt.split('-')[1]));
      } else if (lockedCard === null) {
        setDemoCardActive(null);
      }
      
      if (lookingAt === 'continue-btn' && lockedCard !== null) {
        setTimeout(() => setStep(3), 800);
      }
    }
  }, [lookingAt, step, activeDot, trackingMode, isFinished, lockedCard]);

  // NOVO: Temporizador da Etapa 1 totalmente dinâmico
  useEffect(() => {
    if (step !== 1 || !isHovering) return setGazeTime(0);
    const interval = setInterval(() => {
      setGazeTime((prev) => {
        if (prev >= 1500) {
          setDotsCompleted((d) => [...d, activeDot]);
          // Lê automaticamente o tamanho da lista de bolinhas
          if (activeDot < CALIBRATION_DOTS.length - 1) setActiveDot((a) => a + 1);
          setIsHovering(false);
          return 0;
        }
        return prev + 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [step, isHovering, activeDot]);

  // NOVO: Verifica se completou TODAS as bolinhas da lista para ir pro Step 2
  useEffect(() => {
    if (dotsCompleted.length === CALIBRATION_DOTS.length && step === 1) setTimeout(() => setStep(2), 600);
  }, [dotsCompleted, step]);

  useEffect(() => {
    if (step !== 2 || demoCardActive === null || lockedCard !== null) return setDemoGazeTime(0);
    const interval = setInterval(() => {
      setDemoGazeTime((prev) => {
        if (prev >= 1200) {
          setLockedCard(demoCardActive); 
          return 1200;
        }
        return prev + 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [step, demoCardActive, lockedCard]);

  useEffect(() => {
    if (step !== 3 || lookingAt !== 'finish-btn') return setFinishGazeTime(0);
    const interval = setInterval(() => {
      setFinishGazeTime((prev) => {
        if (prev >= 1500) {
          setIsFinished(true);
          onComplete();
          return 1500;
        }
        return prev + 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [step, lookingAt, onComplete]);

  const handleDotHover = useCallback((dotId: number) => {
    if (dotId === activeDot && !dotsCompleted.includes(dotId)) setIsHovering(true);
  }, [activeDot, dotsCompleted]);

  const getAvatarMessage = () => {
    if (step === 0) return "Seja bem-vindo à navegação com os olhos do Matraquinha! Como você quer simular hoje?";
    
    if (step === 1) return trackingMode === 'mouse' 
      ? "Vamos calibrar! Passe o mouse sobre a bolinha azul." 
      : "Vamos calibrar! Olhe fixamente para a bolinha azul.";
      
    if (step === 2) {
      if (lockedCard !== null) return "Parabéns, você conseguiu! 🎉 Olhe para 'Continuar' para acessar os recursos do Matraquinha.";
      return trackingMode === 'mouse'
        ? "Hora do teste! Deixe o mouse parado sobre um cartão."
        : "Hora do teste! Fixe o seu olhar em um dos cartões.";
    }

    if (step === 3) return "Você já pode navegar pelo Matraquinha livremente usando o seu olhar. Vamos lá!";
    return "";
  };

  const renderAvatar = (avatarSrc: string) => (
    <div className="flex flex-col items-center justify-center z-10 pointer-events-none mb-6">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-card px-5 py-3 rounded-2xl border-2 border-primary/20 shadow-lg text-center max-w-xs sm:max-w-sm relative mb-4"
      >
        <p className="text-sm sm:text-base font-bold text-foreground">{getAvatarMessage()}</p>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card rotate-45 border-r-2 border-b-2 border-primary/20"></div>
      </motion.div>
      <img src={avatarSrc} className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-md" alt="Avatar" />
    </div>
  );

  const demoCards = [{ label: "GOSTEI", emoji: "👍" }, { label: "QUERO", emoji: "🙋" }, { label: "BOM", emoji: "😊" }, { label: "MAIS", emoji: "✋" }];

  return (
    <div className={isFinished ? "pointer-events-none" : "fixed inset-0 z-40 bg-background overflow-hidden"}>
      
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        width="480"
        height="640"
        style={{ position: 'absolute', top: '-10000px', left: '-10000px', width: '480px', height: '640px', pointerEvents: 'none' }} 
      />

      {trackingMode !== 'camera' && !isFinished && <GazeCursor />}
      
      {trackingMode === 'camera' && step > 0 && hasDetectedFace && (
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
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full px-6 text-center">
              {renderAvatar(characterHappy)}

              {isInitializingCamera ? (
                 <p className="text-primary font-bold animate-pulse mt-4">{loadingMsg}</p>
              ) : (
                <div className="flex flex-col gap-4 mt-2 w-full max-w-xs">
                  <motion.button whileHover={{ scale: 1.03 }} className="px-8 py-4 rounded-2xl bg-secondary border-2 cursor-pointer font-bold w-full" onClick={startMouseMode}>
                    🖱️ Usar Mouse (PC)
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} className="px-8 py-4 rounded-2xl bg-primary/10 border-2 border-primary/30 text-primary cursor-pointer font-bold w-full" onClick={startCameraMode}>
                    📷 Usar Câmera (Mobile)
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="calibration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative h-full flex flex-col items-center justify-center">
              {renderAvatar(characterHappy)}
              
              {CALIBRATION_DOTS.map((dot) => (
                <motion.div key={dot.id} className="absolute" style={{ left: dot.x, top: dot.y, transform: "translate(-50%, -50%)" }}
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: dot.id === activeDot ? 1 : dotsCompleted.includes(dot.id) ? 0.3 : 0.15, scale: dot.id === activeDot ? 1 : 0.6 }}
                >
                  <div
                    data-target={`dot-${dot.id}`}
                    className={`relative w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center cursor-pointer`}
                    onMouseEnter={() => trackingMode === 'mouse' && handleDotHover(dot.id)}
                    onMouseLeave={() => trackingMode === 'mouse' && setIsHovering(false)}
                  >
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="50%" cy="50%" r="40%" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="3" />
                      {dot.id === activeDot && <circle cx="50%" cy="50%" r="40%" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${(gazeTime / 1500) * 251} 251`} />}
                    </svg>
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${dotsCompleted.includes(dot.id) ? "bg-primary" : dot.id === activeDot ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "bg-muted"}`} />
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
                      className={`relative bg-card rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 border-2 transition-all duration-300
                        ${isLocked ? "border-green-500 bg-green-50 scale-105" 
                        : isActive ? "border-primary scale-105" 
                        : "border-transparent"}`}
                      onMouseEnter={() => { if (trackingMode === 'mouse' && lockedCard === null) setDemoCardActive(i); }}
                      onMouseLeave={() => { if (trackingMode === 'mouse' && lockedCard === null) setDemoCardActive(null); }}
                    >
                      <span className="text-3xl sm:text-4xl">{card.emoji}</span>
                      <span className="text-xs sm:text-sm font-bold">{card.label}</span>
                      
                      {isActive && !isLocked && (
                        <motion.div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(demoGazeTime / 1200) * 100}%` }} />
                        </motion.div>
                      )}

                      {isLocked && (
                        <motion.div 
                          initial={{ scale: 0 }} animate={{ scale: 1 }} 
                          className="absolute -top-2 -right-2 bg-green-500 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                        >
                          <span className="text-white text-xs font-bold">✓</span>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              <motion.div
                data-target="continue-btn"
                className={`mt-2 px-8 py-3 rounded-2xl border-2 transition-all 
                  ${lockedCard !== null ? 'opacity-100 cursor-pointer' : 'opacity-40 pointer-events-none'} 
                  ${lookingAt === 'continue-btn' ? 'bg-primary/30 border-primary' : 'bg-primary/10 border-primary/30'}`}
                onMouseEnter={() => trackingMode === 'mouse' && lockedCard !== null && setTimeout(() => setStep(3), 800)}
              >
                <p className="text-primary font-bold">Continuar →</p>
              </motion.div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center px-6">
              {renderAvatar(characterThumbsup)}
              
              <motion.div 
                data-target="finish-btn"
                className="relative mt-4 px-10 py-4 bg-primary rounded-2xl border-2 border-transparent transition-all overflow-hidden cursor-pointer"
                onMouseEnter={() => { if (trackingMode === 'mouse') setLookingAt('finish-btn'); }}
                onMouseLeave={() => { if (trackingMode === 'mouse') setLookingAt(null); }}
                onClick={() => {
                  setIsFinished(true); 
                  onComplete(); 
                }}
              >
                <p className="text-primary-foreground font-bold text-lg relative z-10">
                  Começar a usar! 🚀
                </p>
                {lookingAt === 'finish-btn' && (
                  <div 
                    className="absolute top-0 left-0 h-full bg-black/20 z-0 transition-all duration-75" 
                    style={{ width: `${(finishGazeTime / 1500) * 100}%` }} 
                  />
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