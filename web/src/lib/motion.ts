import type { Transition, Variants } from "framer-motion";

export const easeEditorial = [0.22, 1, 0.36, 1] as const;
export const easeCinematic = [0.16, 1, 0.3, 1] as const;

export const duration = {
  instant: 0.12,
  fast: 0.22,
  normal: 0.42,
  slow: 0.75,
  reveal: 1.05,
  ambient: 12,
} as const;

export const transitionEditorial: Transition = {
  duration: duration.normal,
  ease: easeEditorial,
};

export const transitionCinematic: Transition = {
  duration: duration.slow,
  ease: easeCinematic,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: transitionCinematic,
  },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitionEditorial },
};

export const staggerChildren: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};
