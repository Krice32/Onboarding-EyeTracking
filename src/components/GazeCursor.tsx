import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

const GazeCursor = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { damping: 25, stiffness: 200 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 200 });

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      const y = "touches" in e ? e.touches[0].clientY : e.clientY;
      mouseX.set(x - 24);
      mouseY.set(y - 24);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
    };
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="fixed w-12 h-12 rounded-full pointer-events-none z-50 border-2 border-gaze-ring/60"
      style={{ x: springX, y: springY, mixBlendMode: "multiply" }}
    >
      <motion.div
        className="absolute inset-1 rounded-full bg-gaze-glow/20"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
};

export default GazeCursor;
