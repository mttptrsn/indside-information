"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.25,
  });

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[70] h-px origin-left bg-[var(--accent)]"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}
