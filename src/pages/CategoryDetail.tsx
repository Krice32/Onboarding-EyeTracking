import { useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import PictureCard from "@/components/PictureCard";
import EyeTrackingRuntime from "@/components/EyeTrackingRuntime";
import BottomNav from "@/components/BottomNav";

import characterThumbsup from "@/assets/character-thumbsup.png";
import cardQuero from "@/assets/card-quero.png";
import cardPegue from "@/assets/card-pegue.png";
import cardFaco from "@/assets/card-faco.png";
import characterSmile from "@/assets/character-smile.png";
import cardMais from "@/assets/card-mais.png";

const cards = [
  { label: "GOSTEI", image: characterThumbsup },
  { label: "QUERO", image: cardQuero },
  { label: "PEGUE", image: cardPegue },
  { label: "FACO", image: cardFaco },
  { label: "BOM", image: characterSmile },
  { label: "MAIS", image: cardMais },
];

const CategoryDetail = () => {
  const navigate = useNavigate();
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
              onGazeSelect={() => {
                // Espaco para acao futura: voz, som ou feedback visual.
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
