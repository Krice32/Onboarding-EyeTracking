import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import PictureCard from "@/components/PictureCard";
import EyeTrackingRuntime from "@/components/EyeTrackingRuntime";
import BottomNav from "@/components/BottomNav";

import foodPizza from "@/assets/food-pizza.svg";
import drinkWater from "@/assets/drink-water.svg";
import drinkJuice from "@/assets/drink-juice.svg";
import foodBurger from "@/assets/food-burger.svg";
import foodFruit from "@/assets/food-fruit.svg";
import drinkCoffee from "@/assets/drink-coffee.svg";

const REPEAT_COOLDOWN_MS = 2500;

const cards = [
  { label: "PIZZA", image: foodPizza, phrase: "Quero comer pizza." },
  { label: "AGUA", image: drinkWater, phrase: "Eu quero beber agua." },
  { label: "SUCO", image: drinkJuice, phrase: "Eu quero beber suco." },
  { label: "LANCHE", image: foodBurger, phrase: "Quero comer um lanche." },
  { label: "FRUTA", image: foodFruit, phrase: "Quero comer fruta." },
  { label: "CAFÉ", image: drinkCoffee, phrase: "Eu quero tomar café." },
];

type DayCard = (typeof cards)[number];

const CategoryDetail = () => {
  const navigate = useNavigate();
  const [selectedCardLabel, setSelectedCardLabel] = useState<string | null>(null);
  const [currentPhrase, setCurrentPhrase] = useState("Selecione um cartao para montar a frase.");
  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const repeatCooldownByCardRef = useRef<Record<string, number>>({});
  const speechSessionRef = useRef(0);
  const activeSpeechRef = useRef<{ session: number; label: string } | null>(null);

  const findPreferredVoice = useCallback(() => {
    if (!speechSupported) return null;

    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((voice) => voice.lang.toLowerCase().startsWith("pt-br")) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith("pt")) ??
      null
    );
  }, [speechSupported]);

  const handleSpeechFinished = useCallback((session: number, cardLabel: string) => {
    if (activeSpeechRef.current?.session !== session) return;

    activeSpeechRef.current = null;
    setSelectedCardLabel(null);
    repeatCooldownByCardRef.current[cardLabel] = Date.now() + REPEAT_COOLDOWN_MS;
  }, []);

  const speakCardPhrase = useCallback(
    (card: DayCard) => {
      const now = Date.now();
      if (now < (repeatCooldownByCardRef.current[card.label] ?? 0)) return;

      if (activeSpeechRef.current?.label === card.label) return;

      setSelectedCardLabel(card.label);
      setCurrentPhrase(card.phrase);

      if (!speechSupported) {
        window.setTimeout(() => {
          setSelectedCardLabel(null);
          repeatCooldownByCardRef.current[card.label] = Date.now() + REPEAT_COOLDOWN_MS;
        }, 900);
        return;
      }

      const preferredVoice = findPreferredVoice();
      const utterance = new SpeechSynthesisUtterance(card.phrase);
      utterance.lang = "pt-BR";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      const session = speechSessionRef.current + 1;
      speechSessionRef.current = session;
      activeSpeechRef.current = { session, label: card.label };

      utterance.onend = () => {
        handleSpeechFinished(session, card.label);
      };
      utterance.onerror = () => {
        handleSpeechFinished(session, card.label);
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [findPreferredVoice, handleSpeechFinished, speechSupported]
  );

  useEffect(() => {
    if (!speechSupported) return;

    const handleVoicesChanged = () => {
      // Em alguns navegadores, a lista de vozes carrega apos a primeira renderizacao.
      window.speechSynthesis.getVoices();
    };

    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    return () => {
      window.speechSynthesis.cancel();
      activeSpeechRef.current = null;
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, [speechSupported]);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/?screen=app");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <EyeTrackingRuntime />

      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 px-4 py-3 flex items-center justify-between">
        <button
          onClick={handleGoBack}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
        <h1 className="text-lg font-extrabold text-foreground">Dia a Dia</h1>
        <button className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center text-foreground">
          <LayoutGrid className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </header>

      <div className="px-4 pt-2 max-w-lg mx-auto">
        <div className="rounded-xl border border-primary/20 bg-card px-4 py-3 text-sm font-semibold text-foreground">
          Frase: <span className="text-primary">{currentPhrase}</span>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-2 gap-4 px-4 py-4 max-w-lg mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.05 }}
      >
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <PictureCard
              label={card.label}
              image={card.image}
              isSelected={selectedCardLabel === card.label}
              onGazeSelect={() => {
                speakCardPhrase(card);
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default CategoryDetail;
