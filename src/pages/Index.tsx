import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutGrid, ScanEye, Sparkles } from "lucide-react";
import EyeTrackingOnboarding from "@/components/EyeTrackingOnboarding";
import CategoryCard from "@/components/CategoryCard";
import BottomNav from "@/components/BottomNav";
import EyeTrackingRuntime from "@/components/EyeTrackingRuntime";
import { useTrackingMode } from "@/context/TrackingModeContext";

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
  const { trackingMode, setTrackingMode } = useTrackingMode();

  const setScreen = (nextScreen: "home" | "calibration" | "app") => {
    if (nextScreen === "home") {
      setSearchParams({});
      return;
    }

    setSearchParams({ screen: nextScreen });
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bom dia!");
    else if (hour < 18) setGreeting("Boa tarde!");
    else setGreeting("Boa noite!");
  }, []);

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

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-7 w-full rounded-2xl bg-primary text-primary-foreground font-extrabold py-4 shadow-lg"
              onClick={() => setScreen("calibration")}
            >
              Iniciar calibracao
            </motion.button>

            {trackingMode && (
              <button
                className="mt-3 w-full rounded-2xl border-2 border-primary/25 bg-card py-3 font-bold text-primary"
                onClick={() => setScreen("app")}
              >
                Entrar direto no Matraquinha
              </button>
            )}
          </motion.div>
        </main>
      </div>
    );
  }

  if (screen === "calibration") {
    return (
      <EyeTrackingOnboarding
        onComplete={(mode) => {
          setTrackingMode(mode);
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
          title: "Meus Cartoes",
          description: "Cartoes personalizados",
          image: characterWave,
          color: "bg-category-pessoal",
          locked: true,
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
          title: "Necessidades",
          description: "Pedir o que precisa",
          image: characterSmile,
          color: "bg-category-necessidades",
          locked: true,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <EyeTrackingRuntime />

      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 px-4 py-4 flex items-center justify-between">
        <div />
        <h1 className="text-xl font-extrabold text-foreground">{greeting}</h1>
        <button className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center text-foreground">
          <LayoutGrid className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </header>

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
