import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import EyeTrackingRuntime from "@/components/EyeTrackingRuntime";
import BottomNav from "@/components/BottomNav";
import characterHappy from "@/assets/character-happy.png";
import characterThumbsup from "@/assets/character-thumbsup.png";

type ColorItem = {
  id: string;
  label: string;
  hex: string;
};

type Round = {
  questionColor: ColorItem;
  options: ColorItem[];
};

const ROUNDS_TOTAL = 6;

const COLORS: ColorItem[] = [
  { id: "vermelho", label: "Vermelho", hex: "#ef4444" },
  { id: "azul", label: "Azul", hex: "#3b82f6" },
  { id: "verde", label: "Verde", hex: "#22c55e" },
  { id: "amarelo", label: "Amarelo", hex: "#facc15" },
  { id: "laranja", label: "Laranja", hex: "#fb923c" },
  { id: "rosa", label: "Rosa", hex: "#f472b6" },
];

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildQuestionOrder = () => {
  const unique = shuffle(COLORS);
  if (ROUNDS_TOTAL <= unique.length) {
    return unique.slice(0, ROUNDS_TOTAL);
  }

  const extended = [...unique];
  while (extended.length < ROUNDS_TOTAL) {
    extended.push(...shuffle(COLORS));
  }

  return extended.slice(0, ROUNDS_TOTAL);
};

const buildRound = (questionColorId: string): Round => {
  const questionColor = COLORS.find((item) => item.id === questionColorId) ?? COLORS[0];
  const distractors = shuffle(COLORS.filter((item) => item.id !== questionColor.id)).slice(0, 3);
  const options = shuffle([questionColor, ...distractors]);
  return { questionColor, options };
};

const ColorChallenge = () => {
  const navigate = useNavigate();
  const initialOrderRef = useRef<ColorItem[]>(buildQuestionOrder());
  const scoreRef = useRef(0);
  const selectionLockRef = useRef(false);
  const announcedRoundKeyRef = useRef<string | null>(null);

  const [roundNumber, setRoundNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [questionOrder, setQuestionOrder] = useState<ColorItem[]>(initialOrderRef.current);
  const [round, setRound] = useState<Round>(() => buildRound(initialOrderRef.current[0].id));
  const [isLocked, setIsLocked] = useState(false);
  const [highlightedOptionId, setHighlightedOptionId] = useState<string | null>(null);

  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const hasUnlockedSpeechRef = useRef(false);
  const pendingSpeechRef = useRef<string | null>(null);
  const roundTimeoutRef = useRef<number | null>(null);

  const mascotMessage = useMemo(() => {
    if (isFinished) {
      return `Fim do desafio! Voce acertou ${score} de ${ROUNDS_TOTAL}.`;
    }

    if (feedback) return feedback;
    return `Rodada ${roundNumber}. Qual e a cor ${round.questionColor.label.toLowerCase()}?`;
  }, [feedback, isFinished, round.questionColor.label, roundNumber, score]);

  const getPreferredVoice = useCallback(() => {
    if (!speechSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find((voice) => voice.lang.toLowerCase().startsWith("pt-br")) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("pt")) ?? null;
  }, [speechSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!speechSupported) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      const preferredVoice = getPreferredVoice();
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        if (pendingSpeechRef.current === text) {
          pendingSpeechRef.current = null;
        }
      };

      utterance.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "audio-busy") {
          pendingSpeechRef.current = text;
        }
      };

      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [getPreferredVoice, speechSupported]
  );

  const unlockSpeech = useCallback(() => {
    if (!speechSupported) return;
    if (hasUnlockedSpeechRef.current && !pendingSpeechRef.current) return;
    hasUnlockedSpeechRef.current = true;
    window.speechSynthesis.resume();

    if (pendingSpeechRef.current) {
      const replay = pendingSpeechRef.current;
      speak(replay);
    }
  }, [speak, speechSupported]);

  const announceRound = useCallback(() => {
    const prompt = `Rodada ${roundNumber}. Qual e a cor ${round.questionColor.label.toLowerCase()}?`;
    pendingSpeechRef.current = prompt;
    speak(prompt);
  }, [round.questionColor.label, roundNumber, speak]);

  const goToNextRound = useCallback(
    (nextScore?: number) => {
      const finalScore = nextScore ?? scoreRef.current;
      if (roundNumber >= ROUNDS_TOTAL) {
        setIsFinished(true);
        setIsLocked(true);
        selectionLockRef.current = true;
        speak(`Desafio concluido. Voce acertou ${finalScore} de ${ROUNDS_TOTAL}.`);
        return;
      }

      const nextIndex = roundNumber;
      const nextQuestion = questionOrder[nextIndex];

      if (!nextQuestion) {
        setIsFinished(true);
        setIsLocked(true);
        selectionLockRef.current = true;
        speak(`Desafio concluido. Voce acertou ${finalScore} de ${ROUNDS_TOTAL}.`);
        return;
      }

      setRoundNumber((current) => current + 1);
      setRound(buildRound(nextQuestion.id));
      setFeedback(null);
      setIsLocked(false);
      setHighlightedOptionId(null);
      selectionLockRef.current = false;
    },
    [questionOrder, roundNumber, speak]
  );

  const handleSelectOption = (option: ColorItem) => {
    if (selectionLockRef.current || isLocked || isFinished) return;

    selectionLockRef.current = true;
    setIsLocked(true);
    setHighlightedOptionId(option.id);

    const isCorrect = option.id === round.questionColor.id;
    const nextScore = isCorrect ? scoreRef.current + 1 : scoreRef.current;

    if (isCorrect) {
      scoreRef.current = nextScore;
      setScore(nextScore);
      setFeedback("Muito bem! Voce acertou.");
      speak("Muito bem! Voce acertou.");
    } else {
      setFeedback("Boa tentativa! Vamos para a proxima.");
      speak("Boa tentativa! Vamos para a proxima.");
    }

    if (roundTimeoutRef.current) {
      window.clearTimeout(roundTimeoutRef.current);
    }

    roundTimeoutRef.current = window.setTimeout(() => {
      goToNextRound(nextScore);
    }, 1500);
  };

  const restartChallenge = () => {
    if (roundTimeoutRef.current) {
      window.clearTimeout(roundTimeoutRef.current);
      roundTimeoutRef.current = null;
    }

    const nextOrder = buildQuestionOrder();
    scoreRef.current = 0;
    selectionLockRef.current = false;
    announcedRoundKeyRef.current = null;
    pendingSpeechRef.current = null;
    setQuestionOrder(nextOrder);
    setRoundNumber(1);
    setScore(0);
    setIsFinished(false);
    setIsLocked(false);
    setFeedback(null);
    setHighlightedOptionId(null);
    setRound(buildRound(nextOrder[0].id));
  };

  useEffect(() => {
    if (isFinished) return;
    const roundKey = `${roundNumber}-${round.questionColor.id}`;
    if (announcedRoundKeyRef.current === roundKey) return;
    announcedRoundKeyRef.current = roundKey;

    const timeout = window.setTimeout(() => {
      announceRound();
    }, 150);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [announceRound, isFinished, round.questionColor.id, roundNumber]);

  useEffect(() => {
    if (!speechSupported) return;
    const handleVoicesChanged = () => {
      window.speechSynthesis.getVoices();
    };

    window.speechSynthesis.getVoices();

    window.addEventListener("pointerdown", unlockSpeech);
    window.addEventListener("touchstart", unlockSpeech);
    window.addEventListener("click", unlockSpeech);
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    return () => {
      window.removeEventListener("pointerdown", unlockSpeech);
      window.removeEventListener("touchstart", unlockSpeech);
      window.removeEventListener("click", unlockSpeech);
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, [speechSupported, unlockSpeech]);

  useEffect(() => {
    return () => {
      if (roundTimeoutRef.current) {
        window.clearTimeout(roundTimeoutRef.current);
      }

      if (speechSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechSupported]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <EyeTrackingRuntime />

      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate("/explorar")}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
        <h1 className="text-lg font-extrabold text-foreground">Desafio das Cores</h1>
        <button
          onClick={announceRound}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center text-foreground"
        >
          <RefreshCcw className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </header>

      <main className="px-4 max-w-lg mx-auto py-4 space-y-4">
        <div className="rounded-2xl border border-primary/20 bg-card px-4 py-3">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Rodada {Math.min(roundNumber, ROUNDS_TOTAL)} de {ROUNDS_TOTAL}</span>
            <span>Pontos: {score}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(Math.min(roundNumber, ROUNDS_TOTAL) / ROUNDS_TOTAL) * 100}%` }}
            />
          </div>
        </div>

        <div className="w-full flex flex-col items-center justify-center z-10 pointer-events-none mb-2">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full bg-card px-4 sm:px-5 py-3 rounded-2xl border-2 border-primary/20 shadow-lg text-center relative mb-4"
          >
            <p className="text-sm sm:text-base leading-snug font-bold text-foreground">{mascotMessage}</p>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card rotate-45 border-r-2 border-b-2 border-primary/20" />
          </motion.div>
          <img
            src={isFinished ? characterThumbsup : characterHappy}
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-md"
            alt="Mascote"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {round.options.map((option) => {
            const isCorrect = option.id === round.questionColor.id;
            const isSelected = highlightedOptionId === option.id;

            return (
              <button
                key={`${round.questionColor.id}-${option.id}`}
                onClick={() => handleSelectOption(option)}
                aria-label={`Cor ${option.label}`}
                className={`relative rounded-2xl p-5 min-h-[120px] border-2 cursor-pointer transition-all duration-300 ${
                  isLocked
                    ? isSelected
                      ? isCorrect
                        ? "border-green-500 scale-[1.02]"
                        : "border-red-500"
                      : isCorrect
                        ? "border-green-500/70"
                        : "border-transparent"
                    : "border-primary/20 hover:border-primary/60"
                }`}
                style={{ backgroundColor: option.hex }}
                data-gaze-target={`color-${option.id}`}
              >
                <span className="sr-only">{option.label}</span>
              </button>
            );
          })}
        </div>

        {isFinished && (
          <div className="rounded-2xl border border-primary/20 bg-card px-4 py-4 text-center">
            <p className="text-lg font-black text-foreground">Voce concluiu o desafio!</p>
            <p className="text-sm text-muted-foreground mt-1">Pontuacao final: {score} / {ROUNDS_TOTAL}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={restartChallenge} className="flex-1 rounded-xl bg-primary text-primary-foreground font-bold py-2">
                Jogar novamente
              </button>
              <button onClick={() => navigate("/explorar")} className="flex-1 rounded-xl border border-primary/30 text-primary font-bold py-2">
                Voltar
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default ColorChallenge;
