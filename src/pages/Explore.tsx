import { LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import EyeTrackingRuntime from "@/components/EyeTrackingRuntime";
import BottomNav from "@/components/BottomNav";
import CategoryCard from "@/components/CategoryCard";
import characterWave from "@/assets/character-wave.png";

const Explore = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <EyeTrackingRuntime />

      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 px-4 py-4 flex items-center justify-between">
        <div className="w-12" />
        <h1 className="text-xl font-extrabold text-foreground">Explorar</h1>
        <button className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center text-foreground">
          <LayoutGrid className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-8 py-4">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <h2 className="text-xl font-extrabold text-primary">Jogos</h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          <CategoryCard
            title="Desafio das Cores"
            description="Escute o mascote e escolha a cor correta"
            image={characterWave}
            colorClass="bg-category-dia"
            onClick={() => navigate("/desafio/cores")}
          />
        </motion.section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Explore;
