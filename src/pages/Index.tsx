import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import EyeTrackingOnboarding from "@/components/EyeTrackingOnboarding";
import CategoryCard from "@/components/CategoryCard";
import BottomNav from "@/components/BottomNav";
import GazeCursor from "@/components/GazeCursor";

import characterThumbsup from "@/assets/character-thumbsup.png";
import characterWave from "@/assets/character-wave.png";
import characterHappy from "@/assets/character-happy.png";
import characterSmile from "@/assets/character-smile.png";

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [greeting, setGreeting] = useState("Bom dia!");
  const navigate = useNavigate();

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Bom dia!");
    else if (h < 18) setGreeting("Boa tarde!");
    else setGreeting("Boa noite!");
  }, []);

  if (showOnboarding) {
    return <EyeTrackingOnboarding onComplete={() => setShowOnboarding(false)} />;
  }

  const categories = [
    {
      section: "Dia a Dia",
      items: [
        { title: "Dia a Dia", description: "Ações para expressar necessidades", image: characterThumbsup, color: "bg-category-dia", path: "/categoria/dia-a-dia" },
        { title: "Meus Cartões", description: "Cartões personalizados", image: characterWave, color: "bg-category-pessoal", locked: true },
      ],
    },
    {
      section: "Pessoal",
      items: [
        { title: "Emoções", description: "Expressar sentimentos", image: characterHappy, color: "bg-category-emocoes" },
        { title: "Necessidades", description: "Pedir o que precisa", image: characterSmile, color: "bg-category-necessidades", locked: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <GazeCursor />

      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 px-4 py-4 flex items-center justify-between">
        <div />
        <h1 className="text-xl font-extrabold text-foreground">{greeting}</h1>
        <button className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-foreground">
          <LayoutGrid className="w-5 h-5" />
        </button>
      </header>

      {/* Content */}
      <div className="px-4 max-w-lg mx-auto space-y-8 py-4">
        {categories.map((cat, ci) => (
          <motion.section
            key={cat.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.15 }}
          >
            {/* Section title */}
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
