import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GazeCursor from "./GazeCursor";
import characterWave from "@/assets/character-wave.png";
import characterHappy from "@/assets/character-happy.png";
import characterThumbsup from "@/assets/character-thumbsup.png";

interface CalibrationDot {
  id: number;
  x: string;
  y: string;
  label: string;
}

const CALIBRATION_DOTS: CalibrationDot[] = [
  { id: 0, x: "15%", y: "20%", label: "↖" },
  { id: 1, x: "85%", y: "20%", label: "↗" },
  { id: 2, x: "85%", y: "75%", label: "↘" },
  { id: 3, x: "15%", y: "75%", label: "↙" },
];

interface Props {
  onComplete: () => void;
}

const EyeTrackingOnboarding = ({ onComplete }: Props) => {
  const [step, setStep] = useState(0);
  const [activeDot, setActiveDot] = useState(0);
  const [dotsCompleted, setDotsCompleted] = useState<number[]>([]);
  const [gazeTime, setGazeTime] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [demoCardActive, setDemoCardActive] = useState<number | null>(null);
  const [demoGazeTime, setDemoGazeTime] = useState(0);

  // ESTADOS DE GERENCIAMENTO DA CÂMERA/MOUSE
  const [trackingMode, setTrackingMode] = useState<'mouse' | 'camera' | null>(null);
  const [lookingAt, setLookingAt] = useState<string | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Preparando para iniciar..."); // NOVO: Estado de loading detalhado

  // Função para iniciar o modo Câmera (Com debug de passos)
const startCameraMode = async () => {
    setIsInitializingCamera(true);
    setTrackingMode('camera');
    setLoadingMsg("Preparando ambiente...");

    const initWebGazer = async () => {
      try {
        const webgazer = (window as any).webgazer;
        if (!webgazer) throw new Error("A biblioteca não carregou a tempo.");

        setLoadingMsg("Solicitando câmera (pode demorar alguns segundos)...");

        // Limpa o cache antigo de IA que causava o erro TENSOR_DICT_MAP
        if (typeof webgazer.clearData === 'function') {
          webgazer.clearData();
        }

        // INICIA O MOTOR: Agora deixamos o próprio WebGazer pedir a câmera no tempo dele
        await webgazer.setRegression('ridge')
          .setGazeListener((data: any) => {
            if (data) {
              const el = document.elementFromPoint(data.x, data.y);
              const target = el?.closest('[data-target]')?.getAttribute('data-target');
              setLookingAt(target || null);
            }
          })
          .begin();

        setLoadingMsg("Ajustando vídeo para a tela...");

        // Pega o vídeo gerado pelo WebGazer e garante que rode liso no mobile e PC
        const video = document.getElementById('webgazerVideoFeed') as HTMLVideoElement;
        if (video) {
          video.playsInline = true;
        }

        webgazer.showVideoPreview(true).showPredictionPoints(true);
        setIsInitializingCamera(false);
        setStep(1); 
      } catch (error: any) {
        console.error("ERRO DETALHADO DO WEBGAZER:", error);
        alert(`Erro ao iniciar câmera: ${error.message || error}`);
        setIsInitializingCamera(false);
        setTrackingMode(null);
      }
    };

    if ((window as any).webgazer) {
      initWebGazer();
    } else {
      setLoadingMsg("Baixando biblioteca de visão...");
      const script = document.createElement('script');
      script.src = "https://webgazer.cs.brown.edu/webgazer.js";
      script.async = true;
      // O GRANDE TRUQUE: Dá 500ms para a biblioteca se montar internamente antes de rodar
      script.onload = () => setTimeout(initWebGazer, 500);
      script.onerror = () => {
        alert("Erro de rede ao baixar a biblioteca de rastreamento.");
        setIsInitializingCamera(false);
        setTrackingMode(null);
      };
      document.body.appendChild(script);
    }
  };

  // Função para iniciar o modo Mouse
  const startMouseMode = () => {
    setTrackingMode('mouse');
    setStep(1);
  };

  // Limpa o WebGazer se o componente for desmontado para não vazar memória
  useEffect(() => {
    return () => {
      const webgazer = (window as any).webgazer;
      if (webgazer) {
        webgazer.end();
        const videoContainer = document.getElementById('webgazerVideoContainer');
        if (videoContainer) videoContainer.remove();
      }
    };
  }, []);

  // LÓGICA DA CÂMERA: Atualiza os estados baseado para onde o usuário olha
  useEffect(() => {
    if (trackingMode !== 'camera') return;

    if (step === 1) {
      if (lookingAt === `dot-${activeDot}`) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    }

    if (step === 2) {
      if (lookingAt?.startsWith('card-')) {
        const idx = parseInt(lookingAt.split('-')[1]);
        setDemoCardActive(idx);
      } else {
        setDemoCardActive(null);
      }

      if (lookingAt === 'continue-btn') {
        setTimeout(() => setStep(3), 800);
      }
    }
  }, [lookingAt, step, activeDot, trackingMode]);


  // LÓGICA DOS TEMPORIZADORES (Intacta)
  useEffect(() => {
    if (step !== 1 || !isHovering) {
      setGazeTime(0);
      return;
    }
    const interval = setInterval(() => {
      setGazeTime((prev) => {
        if (prev >= 1500) {
          setDotsCompleted((d) => [...d, activeDot]);
          if (activeDot < 3) {
            setActiveDot((a) => a + 1);
          }
          setIsHovering(false);
          return 0;
        }
        return prev + 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [step, isHovering, activeDot]);

  useEffect(() => {
    if (dotsCompleted.length === 4 && step === 1) {
      setTimeout(() => setStep(2), 600);
    }
  }, [dotsCompleted, step]);

  useEffect(() => {
    if (step !== 2 || demoCardActive === null) {
      setDemoGazeTime(0);
      return;
    }
    const interval = setInterval(() => {
      setDemoGazeTime((prev) => {
        if (prev >= 1200) return 1200;
        return prev + 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [step, demoCardActive]);

  const handleDotHover = useCallback(
    (dotId: number) => {
      if (dotId === activeDot && !dotsCompleted.includes(dotId)) {
        setIsHovering(true);
      }
    },
    [activeDot, dotsCompleted]
  );

  const demoCards = [
    { label: "GOSTEI", emoji: "👍" },
    { label: "QUERO", emoji: "🙋" },
    { label: "BOM", emoji: "😊" },
    { label: "MAIS", emoji: "✋" },
  ];

  return (
    <div className="fixed inset-0 z-40 bg-background overflow-hidden">
      {/* Cursor só renderiza no modo mouse */}
      {trackingMode !== 'camera' && <GazeCursor />}

      <AnimatePresence mode="wait">
        {/* STEP 0: Welcome */}
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center h-full px-6 text-center gap-6"
          >
            <motion.img
              src={characterWave}
              alt="Personagem acenando"
              className="w-40 h-40 object-contain"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.h1 className="text-3xl font-extrabold text-foreground" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              Olá! 👋
            </motion.h1>
            <motion.p className="text-lg text-muted-foreground max-w-xs" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              Como você quer simular o uso do aplicativo hoje?
            </motion.p>

            {isInitializingCamera ? (
               <p className="text-primary font-bold animate-pulse mt-6 text-center max-w-xs">
                 {loadingMsg} {/* Exibindo o estado de carregamento passo a passo */}
               </p>
            ) : (
              <div className="flex flex-col gap-4 mt-4 w-full max-w-xs">
                <motion.button
                  className="px-8 py-4 rounded-2xl bg-secondary border-2 border-secondary/50 cursor-pointer text-foreground font-bold text-lg w-full"
                  whileHover={{ scale: 1.05 }}
                  onClick={startMouseMode}
                >
                  🖱️ Usar Mouse (PC)
                </motion.button>
                
                <motion.button
                  className="px-8 py-4 rounded-2xl bg-primary/10 border-2 border-primary/30 cursor-pointer text-primary font-bold text-lg w-full"
                  whileHover={{ scale: 1.05, borderColor: "hsl(190, 60%, 30%)" }}
                  onClick={startCameraMode}
                >
                  📷 Usar Câmera (Mobile)
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 1: Calibration */}
        {step === 1 && (
          <motion.div key="calibration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative h-full">
            <div className="absolute top-8 left-0 right-0 text-center z-10">
              <motion.p className="text-lg font-bold text-foreground">
                Calibrando sua intenção...
              </motion.p>
              <p className="text-sm text-muted-foreground mt-1">
                {trackingMode === 'mouse' ? "Passe o mouse pelo ponto iluminado 🔵" : "Olhe para o ponto iluminado e clique nele 🔵"}
              </p>
              <div className="flex justify-center gap-2 mt-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${dotsCompleted.includes(i) ? "bg-primary scale-100" : i === activeDot ? "bg-gaze-glow animate-pulse-gaze" : "bg-muted"}`} />
                ))}
              </div>
            </div>

            {CALIBRATION_DOTS.map((dot) => (
              <motion.div key={dot.id} className="absolute" style={{ left: dot.x, top: dot.y, transform: "translate(-50%, -50%)" }}
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: dot.id === activeDot ? 1 : dotsCompleted.includes(dot.id) ? 0.3 : 0.15, scale: dot.id === activeDot ? 1 : 0.6 }}
              >
                <div
                  data-target={`dot-${dot.id}`}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center cursor-pointer ${dot.id === activeDot ? "gaze-glow" : ""}`}
                  onMouseEnter={() => trackingMode === 'mouse' && handleDotHover(dot.id)}
                  onMouseLeave={() => trackingMode === 'mouse' && setIsHovering(false)}
                  onClick={() => {
                    if (dot.id === activeDot) {
                      setDotsCompleted((d) => [...d, dot.id]);
                      if (activeDot < 3) setActiveDot((a) => a + 1);
                    }
                  }}
                >
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(var(--gaze-glow) / 0.2)" strokeWidth="3" />
                    {dot.id === activeDot && (
                      <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(var(--gaze-ring))" strokeWidth="3" strokeDasharray={`${(gazeTime / 1500) * 251} 251`} strokeLinecap="round" className="transition-all duration-100" />
                    )}
                  </svg>
                  <div className={`w-8 h-8 rounded-full ${dotsCompleted.includes(dot.id) ? "bg-primary" : dot.id === activeDot ? "bg-gaze-glow animate-pulse-gaze" : "bg-muted"}`} />
                </div>
              </motion.div>
            ))}

            <motion.img src={characterHappy} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-28 h-28 object-contain" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 0.6, y: 0 }} />
          </motion.div>
        )}

        {/* STEP 2: Demo */}
        {step === 2 && (
          <motion.div key="demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full px-6 gap-6">
            <motion.div className="text-center">
              <p className="text-lg font-bold text-foreground">Agora tente!</p>
              <p className="text-sm text-muted-foreground">
                {trackingMode === 'mouse' ? "Passe o mouse em um cartão por 1 segundo 👀" : "Olhe para um cartão por 1 segundo 👀"}
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              {demoCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  data-target={`card-${i}`}
                  className={`relative bg-card rounded-2xl p-6 flex flex-col items-center justify-center gap-3 card-shadow cursor-pointer transition-all duration-300 ${demoCardActive === i && demoGazeTime >= 1200 ? "gaze-ring" : ""}`}
                  onMouseEnter={() => {
                    if (trackingMode === 'mouse') {
                      setDemoCardActive(i);
                      setDemoGazeTime(0);
                    }
                  }}
                  onMouseLeave={() => {
                    if (trackingMode === 'mouse') {
                      setDemoCardActive(null);
                      setDemoGazeTime(0);
                    }
                  }}
                  onClick={() => setDemoCardActive(i)}
                >
                  <span className="text-4xl">{card.emoji}</span>
                  <span className="text-sm font-bold text-foreground">{card.label}</span>

                  {demoCardActive === i && (
                    <motion.div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden">
                      <div className="h-full bg-gaze-glow transition-all duration-100 rounded-b-2xl" style={{ width: `${(demoGazeTime / 1200) * 100}%` }} />
                    </motion.div>
                  )}
                  {demoCardActive === i && demoGazeTime >= 1200 && (
                    <motion.div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <span className="text-primary-foreground text-xs">✓</span>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            <motion.div
              data-target="continue-btn"
              className="mt-4 px-8 py-3 rounded-2xl bg-primary/10 border-2 border-primary/30 cursor-pointer"
              onMouseEnter={() => trackingMode === 'mouse' && setTimeout(() => setStep(3), 800)}
              onClick={() => setStep(3)}
            >
              <p className="text-primary font-bold">Continuar →</p>
            </motion.div>
          </motion.div>
        )}

        {/* STEP 3: Complete */}
        {step === 3 && (
          <motion.div key="complete" className="flex flex-col items-center justify-center h-full px-6 text-center gap-6">
            <motion.img src={characterThumbsup} className="w-44 h-44 object-contain" animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
            <h2 className="text-2xl font-extrabold text-foreground">Calibração completa! 🎉</h2>
            <p className="text-muted-foreground">Fixação detectada. Precisão: <span className="font-bold text-primary">99.2%</span></p>
            <motion.div className="mt-4 px-10 py-4 rounded-2xl bg-primary cursor-pointer" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={onComplete}>
              <p className="text-primary-foreground font-bold text-lg">Começar a usar! 🚀</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EyeTrackingOnboarding;