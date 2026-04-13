import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutGrid, ScanEye, Sparkles } from "lucide-react";
import EyeTrackingOnboarding from "@/components/EyeTrackingOnboarding";
import CategoryCard from "@/components/CategoryCard";
import BottomNav from "@/components/BottomNav";
import EyeTrackingRuntime from "@/components/EyeTrackingRuntime";
import { type TrackingMode, useTrackingMode } from "@/context/TrackingModeContext";
import { useTelemetry } from "@/context/TelemetryContext";

import characterThumbsup from "@/assets/character-thumbsup.png";
import characterWave from "@/assets/character-wave.png";
import characterHappy from "@/assets/character-happy.png";
import characterSmile from "@/assets/character-smile.png";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const screenParam = searchParams.get("screen");
  const screen: "home" | "calibration" | "app" =
    screenParam === "calibration" || screenParam === "app" ? screenParam : "home";
  const [greeting, setGreeting] = useState("Bom dia!");
  const navigate = useNavigate();
  const { trackingMode, setTrackingMode, hasCalibratedEyeTracking, setHasCalibratedEyeTracking } = useTrackingMode();
  const { startSession, markNavigationStarted, markModeChange } = useTelemetry();
  const previousScreenRef = useRef(screen);

  const eyeTrackingActive = trackingMode === "camera";

  const applyTrackingMode = (mode: TrackingMode | null) => {
    markModeChange(mode === "camera" ? "camera" : "touch");
    setTrackingMode(mode);
  };

  const setScreen = (nextScreen: "home" | "calibration" | "app") => {
    if (nextScreen === "home") {
      setSearchParams({});
      return;
    }

    setSearchParams({ screen: nextScreen });
  };

  const handleEyeTrackingToggle = () => {
    if (eyeTrackingActive) {
      applyTrackingMode(null);
      return;
    }

    if (hasCalibratedEyeTracking) {
      applyTrackingMode("camera");
      return;
    }

    setScreen("calibration");
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bom dia!");
    else if (hour < 18) setGreeting("Boa tarde!");
    else setGreeting("Boa noite!");
  }, []);

  useEffect(() => {
    // Compatibilidade com estado antigo salvo no navegador.
    if (trackingMode === "mouse") {
      setTrackingMode(null);
    }
  }, [setTrackingMode, trackingMode]);

  useEffect(() => {
    const previousScreen = previousScreenRef.current;
    if (previousScreen === "home" && screen !== "home") {
      startSession();
    }

    if (screen === "app") {
      markNavigationStarted(eyeTrackingActive ? "camera" : "touch");
    }

    previousScreenRef.current = screen;
  }, [eyeTrackingActive, markNavigationStarted, screen, startSession]);

  if (screen === "home") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_15%,hsl(var(--accent)/0.20),transparent_45%),radial-gradient(circle_at_90%_20%,hsl(var(--primary)/0.22),transparent_45%),linear-gradient(160deg,hsl(var(--background)),hsl(var(--surface-cool)))] px-6 py-8">
        <div className="absolute -left-12 top-24 w-44 h-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-16 bottom-28 w-56 h-56 rounded-full bg-accent/25 blur-3xl" />

        <main className="relative z-10 max-w-md mx-auto min-h-[calc(100vh-4rem)] flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-[2rem] border border-white/60 bg-card/85 backdrop-blur-lg shadow-[0_24px_60px_hsl(var(--foreground)/0.12)] p-7"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-primary">
                <ScanEye className="w-3.5 h-3.5" />
                Comunicacao Assistiva
              </div>
              <Sparkles className="w-5 h-5 text-accent" />
            </div>

            <div className="mt-5 flex flex-col-reverse sm:grid sm:grid-cols-[1fr_112px] gap-4 items-center sm:items-end">
              <div className="w-full">
                <h1 className="text-4xl leading-none font-black text-foreground">Matraquinha</h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  Uma experiencia pensada para navegar com mais autonomia usando o olhar.
                </p>
              </div>
              <div className="w-24 h-24 sm:w-28 sm:h-28 overflow-hidden">
                <img src={characterWave} alt="Mascote" className="w-full h-full object-contain object-right drop-shadow-md" />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-2 text-center text-[11px] font-bold text-primary">Calibracao guiada</div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-2 text-center text-[11px] font-bold text-primary">Mouse ou camera</div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-2 text-center text-[11px] font-bold text-primary">Acesso rapido</div>
            </div>

            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left text-xs sm:text-sm text-foreground">
              <p className="font-extrabold text-primary">Como vamos testar</p>
              <p>Voce pode calibrar o Eye Tracking agora, ou entrar sem calibracao usando mouse/touch.</p>
              <p>A primeira calibracao leva em torno de 2 a 3 minutos.</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-7 w-full rounded-2xl bg-primary text-primary-foreground font-extrabold py-4 shadow-lg"
              onClick={() => {
                startSession();
                setScreen("calibration");
              }}
            >
              Fazer calibracao de Eye Tracking
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-3 w-full rounded-2xl border-2 border-primary/30 bg-card py-3 font-bold text-primary"
              onClick={() => {
                startSession();
                applyTrackingMode(null);
                setScreen("app");
              }}
            >
              Iniciar sem calibracao (mouse/touch)
            </motion.button>

            {hasCalibratedEyeTracking && (
              <button
                className="mt-3 w-full rounded-2xl border-2 border-primary/25 bg-card py-3 font-bold text-primary"
                onClick={() => {
                  startSession();
                  applyTrackingMode("camera");
                  setScreen("app");
                }}
              >
                Entrar com Eye Tracking ativo
              </button>
            )}

            <button
              type="button"
              className="mt-4 w-full text-xs font-bold text-primary underline-offset-2 hover:underline"
              onClick={() => navigate("/privacidade")}
            >
              Ler aviso de privacidade e gerenciar consentimento
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  if (screen === "calibration") {
    return (
      <EyeTrackingOnboarding
        onComplete={(mode) => {
          if (mode === "camera") {
            setHasCalibratedEyeTracking(true);
          }

          applyTrackingMode(mode);
          setScreen("app");
        }}
      />
    );
  }

  const categories = [
    {
      section: "Dia a Dia",
      items: [
        {
          title: "Dia a Dia",
          description: "Acoes para expressar necessidades",
          image: characterThumbsup,
          color: "bg-category-dia",
          path: "/categoria/dia-a-dia",
        },
        {
          title: "Necessidades Basicas",
          description: "Banho, banheiro e autocuidado",
          image: characterSmile,
          color: "bg-category-necessidades",
          path: "/categoria/necessidades-basicas",
        },
      ],
    },
    {
      section: "Pessoal",
      items: [
        {
          title: "Emocoes",
          description: "Expressar sentimentos",
          image: characterHappy,
          color: "bg-category-emocoes",
        },
        {
          title: "Meus Cartoes",
          description: "Cartoes personalizados",
          image: characterWave,
          color: "bg-category-pessoal",
          locked: true,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <EyeTrackingRuntime />

      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 px-4 py-4 flex items-center justify-between">
        <div className="w-12" />
        <h1 className="text-xl font-extrabold text-foreground">{greeting}</h1>
        <button className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center text-foreground">
          <LayoutGrid className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </header>

      <div className="px-4 max-w-lg mx-auto pt-3">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleEyeTrackingToggle}
          className={`w-full rounded-2xl border-2 px-4 py-3 text-left transition-all ${
            eyeTrackingActive
              ? "border-transparent bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-white shadow-[0_14px_35px_hsl(var(--primary)/0.35)]"
              : "border-primary/25 bg-card text-foreground shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                  eyeTrackingActive ? "border-white/35 bg-white/15" : "border-primary/25 bg-primary/10"
                }`}
              >
                <ScanEye className={`w-6 h-6 ${eyeTrackingActive ? "text-white" : "text-primary"}`} />
              </div>

              <div>
                <p className={`text-sm font-black ${eyeTrackingActive ? "text-white" : "text-foreground"}`}>Eye Tracking</p>
                <p className={`text-xs font-semibold ${eyeTrackingActive ? "text-white/90" : "text-muted-foreground"}`}>
                  {eyeTrackingActive
                    ? "Ativo. Toque para desativar e continuar no mouse/touch."
                    : hasCalibratedEyeTracking
                      ? "Desativado. Toque para ativar novamente."
                      : "Desativado. Primeira ativacao leva de 2 a 3 min."}
                </p>
              </div>
            </div>

            <div className={`relative w-14 h-8 rounded-full border transition-colors ${eyeTrackingActive ? "border-white/40 bg-white/20" : "border-primary/25 bg-muted/70"}`}>
              <div
                className={`absolute top-1 h-6 w-6 rounded-full shadow-md transition-all ${
                  eyeTrackingActive ? "left-7 bg-white" : "left-1 bg-primary"
                }`}
              />
            </div>
          </div>
        </motion.button>

        <button
          type="button"
          className="mt-3 text-xs font-bold text-primary underline-offset-2 hover:underline"
          onClick={() => navigate("/privacidade")}
        >
          Privacidade e dados
        </button>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-8 py-4">
        {categories.map((cat, ci) => (
          <motion.section
            key={cat.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.15 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border" />
              <h2 className="text-xl font-extrabold text-primary">{cat.section}</h2>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-3">
              {cat.items.map((item) => (
                <CategoryCard
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  image={item.image}
                  colorClass={item.color}
                  locked={item.locked}
                  onClick={() => item.path && navigate(item.path)}
                />
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;

