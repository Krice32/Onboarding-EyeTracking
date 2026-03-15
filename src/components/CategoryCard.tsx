import { motion } from "framer-motion";
import { Lock } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  image: string;
  colorClass: string;
  locked?: boolean;
  onClick?: () => void;
}

const CategoryCard = ({ title, description, image, colorClass, locked, onClick }: Props) => (
  <motion.div
    className={`relative rounded-2xl overflow-hidden card-shadow cursor-pointer ${colorClass}`}
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
  >
    <div className="flex items-center p-4 gap-3 min-h-[120px]">
      <div className="flex-1">
        <h3 className="font-extrabold text-foreground text-base">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
        )}
      </div>
      <div className="relative w-20 h-20 flex-shrink-0">
        <img src={image} alt={title} className="w-full h-full object-contain" />
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 rounded-xl">
            <Lock className="w-6 h-6 text-card" />
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

export default CategoryCard;
