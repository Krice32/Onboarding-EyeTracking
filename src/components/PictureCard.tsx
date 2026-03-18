import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  label: string;
  image: string;
  onGazeSelect?: () => void;
}

const PictureCard = ({ label, image, onGazeSelect }: Props) => {
  const [gazeTime, setGazeTime] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const selected = isSelected || gazeTime >= 1200;

  const handleSelect = useCallback(() => {
    setIsSelected(true);
    onGazeSelect?.();
  }, [onGazeSelect]);

  useEffect(() => {
    if (!isHovering) {
      setGazeTime(0);
      return;
    }
    const interval = setInterval(() => {
      setGazeTime((prev) => {
        if (prev >= 1200) {
          return 1200;
        }

        const next = prev + 50;
        if (next >= 1200) {
          handleSelect();
          return 1200;
        }

        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [handleSelect, isHovering]);

  return (
    <motion.div
      className={`relative bg-card rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center gap-3 card-shadow cursor-pointer transition-all duration-300 ${
        selected ? "gaze-ring" : ""
      }`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleSelect}
    >
      <img src={image} alt={label} className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
      <span className="text-base sm:text-lg font-extrabold text-foreground uppercase tracking-wide">
        {label}
      </span>

      {isHovering && !selected && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div
            className="h-full bg-gaze-glow rounded-b-2xl transition-all duration-100"
            style={{ width: `${(gazeTime / 1200) * 100}%` }}
          />
        </motion.div>
      )}

      {selected && (
        <motion.div
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <span className="text-primary-foreground text-sm font-bold">{"\u2713"}</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PictureCard;
