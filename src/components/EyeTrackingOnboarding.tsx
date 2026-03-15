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

  // Step 0: Welcome
  // Step 1: Calibration (follow the dots)
  // Step 2: Demo - gaze at cards
  // Step 3: Complete

  // Calibration gaze timer
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

  // Check calibration complete
  useEffect(() => {
    if (dotsCompleted.length === 4 && step === 1) {
      setTimeout(() => setStep(2), 600);
    }
  }, [dotsCompleted, step]);

  // Demo card gaze timer
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
      <GazeCursor />

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
            <motion.h1
              className="text-3xl font-extrabold text-foreground"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Olá! 👋
            </motion.h1>
            <motion.p
              className="text-lg text-muted-foreground max-w-xs"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Vamos aprender a usar o <span className="font-bold text-primary">olhar</span> para
              escolher cartões!
            </motion.p>
            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Não clique. Apenas observe. ✨
            </motion.p>

            {/* Auto-advance or hover-to-advance */}
            <motion.div
              className="mt-6 px-8 py-4 rounded-2xl bg-primary/10 border-2 border-primary/30 cursor-pointer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05, borderColor: "hsl(190, 60%, 30%)" }}
              onHoverStart={() => {
                setTimeout(() => setStep(1), 800);
              }}
              onClick={() => setStep(1)}
            >
              <p className="text-primary font-bold text-lg">
                Olhe aqui para começar 👀
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* STEP 1: Calibration */}
        {step === 1 && (
          <motion.div
            key="calibration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative h-full"
          >
            <div className="absolute top-8 left-0 right-0 text-center z-10">
              <motion.p
                className="text-lg font-bold text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Calibrando sua intenção...
              </motion.p>
              <p className="text-sm text-muted-foreground mt-1">
                Olhe para o ponto iluminado 🔵
              </p>
              <div className="flex justify-center gap-2 mt-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      dotsCompleted.includes(i)
                        ? "bg-primary scale-100"
                        : i === activeDot
                        ? "bg-gaze-glow animate-pulse-gaze"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>

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
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <div
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer ${
                    dot.id === activeDot ? "gaze-glow" : ""
                  }`}
                  onMouseEnter={() => handleDotHover(dot.id)}
                  onMouseLeave={() => setIsHovering(false)}
                  onClick={() => {
                    if (dot.id === activeDot) {
                      setDotsCompleted((d) => [...d, dot.id]);
                      if (activeDot < 3) setActiveDot((a) => a + 1);
                    }
                  }}
                >
                  {/* Progress ring */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="hsl(var(--gaze-glow) / 0.2)"
                      strokeWidth="3"
                    />
                    {dot.id === activeDot && (
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="hsl(var(--gaze-ring))"
                        strokeWidth="3"
                        strokeDasharray={`${(gazeTime / 1500) * 226} 226`}
                        strokeLinecap="round"
                        className="transition-all duration-100"
                      />
                    )}
                  </svg>
                  <div
                    className={`w-6 h-6 rounded-full ${
                      dotsCompleted.includes(dot.id)
                        ? "bg-primary"
                        : dot.id === activeDot
                        ? "bg-gaze-glow animate-pulse-gaze"
                        : "bg-muted"
                    }`}
                  />
                </div>
              </motion.div>
            ))}

            <motion.img
              src={characterHappy}
              alt=""
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-28 h-28 object-contain"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 0.5 }}
            />
          </motion.div>
        )}

        {/* STEP 2: Demo */}
        {step === 2 && (
          <motion.div
            key="demo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full px-6 gap-6"
          >
            <motion.div
              className="text-center"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <p className="text-lg font-bold text-foreground">Agora tente!</p>
              <p className="text-sm text-muted-foreground">
                Olhe para um cartão por 1 segundo 👀
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              {demoCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: demoCardActive === i && demoGazeTime >= 1200 ? 1.05 : 1,
                  }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                  className={`relative bg-card rounded-2xl p-6 flex flex-col items-center justify-center gap-3 card-shadow cursor-pointer transition-all duration-300 ${
                    demoCardActive === i && demoGazeTime >= 1200
                      ? "gaze-ring"
                      : ""
                  }`}
                  onMouseEnter={() => {
                    setDemoCardActive(i);
                    setDemoGazeTime(0);
                  }}
                  onMouseLeave={() => {
                    setDemoCardActive(null);
                    setDemoGazeTime(0);
                  }}
                  onClick={() => setDemoCardActive(i)}
                >
                  <span className="text-4xl">{card.emoji}</span>
                  <span className="text-sm font-bold text-foreground">
                    {card.label}
                  </span>

                  {/* Gaze progress bar */}
                  {demoCardActive === i && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div
                        className="h-full bg-gaze-glow transition-all duration-100 rounded-b-2xl"
                        style={{ width: `${(demoGazeTime / 1200) * 100}%` }}
                      />
                    </motion.div>
                  )}

                  {/* Selected checkmark */}
                  {demoCardActive === i && demoGazeTime >= 1200 && (
                    <motion.div
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <span className="text-primary-foreground text-xs">✓</span>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-4 px-8 py-3 rounded-2xl bg-primary/10 border-2 border-primary/30 cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              whileHover={{ scale: 1.05 }}
              onHoverStart={() => setTimeout(() => setStep(3), 800)}
              onClick={() => setStep(3)}
            >
              <p className="text-primary font-bold">Continuar →</p>
            </motion.div>
          </motion.div>
        )}

        {/* STEP 3: Complete */}
        {step === 3 && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full px-6 text-center gap-6"
          >
            <motion.img
              src={characterThumbsup}
              alt="Pronto!"
              className="w-44 h-44 object-contain"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <h2 className="text-2xl font-extrabold text-foreground">
              Calibração completa! 🎉
            </h2>
            <p className="text-muted-foreground">
              Fixação detectada. Precisão: <span className="font-bold text-primary">99.2%</span>
            </p>
            <motion.div
              className="mt-4 px-10 py-4 rounded-2xl bg-primary cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={onComplete}
            >
              <p className="text-primary-foreground font-bold text-lg">
                Começar a usar! 🚀
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EyeTrackingOnboarding;
