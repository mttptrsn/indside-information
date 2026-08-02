"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AmbientLayer() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute left-[-18vw] top-[8vh] size-[58vw] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_5%,transparent),transparent_68%)] blur-3xl"
        animate={
          reducedMotion
            ? undefined
            : {
                x: ["0vw", "8vw", "0vw"],
                y: ["0vh", "7vh", "0vh"],
                scale: [1, 1.08, 1],
              }
        }
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-24vw] right-[-12vw] size-[52vw] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ink)_4%,transparent),transparent_70%)] blur-3xl"
        animate={
          reducedMotion
            ? undefined
            : {
                x: ["0vw", "-5vw", "0vw"],
                y: ["0vh", "-5vh", "0vh"],
              }
        }
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
