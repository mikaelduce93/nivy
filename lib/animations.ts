/**
 * TEENS PARTY MOROCCO - Animation System
 * ======================================
 *
 * Presets Framer Motion réutilisables pour une cohérence des animations
 * à travers toute l'application.
 *
 * Usage:
 * import { fadeInUp, staggerContainer } from '@/lib/animations'
 * <motion.div variants={fadeInUp} initial="hidden" animate="visible" />
 */

import type { Variants, Transition, TargetAndTransition } from 'framer-motion'

/* ==========================================================================
   DURATIONS (en secondes pour Framer Motion)
   ========================================================================== */

export const duration = {
  instant: 0,
  fast: 0.1,
  normal: 0.2,
  moderate: 0.3,
  slow: 0.5,
  slower: 0.7,
  slowest: 1,
} as const

/* ==========================================================================
   EASINGS
   ========================================================================== */

export const easing = {
  // Standard easings
  linear: [0, 0, 1, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
  easeOut: [0, 0, 0.2, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,

  // Custom easings
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
  spring: [0.175, 0.885, 0.32, 1.275] as const,

  // Smooth easings
  smooth: [0.25, 0.1, 0.25, 1] as const,
  smoothOut: [0.33, 1, 0.68, 1] as const,
} as const

/* ==========================================================================
   TRANSITIONS PRESETS
   ========================================================================== */

export const transition = {
  fast: {
    duration: duration.fast,
    ease: easing.easeOut,
  } as Transition,

  normal: {
    duration: duration.normal,
    ease: easing.easeOut,
  } as Transition,

  moderate: {
    duration: duration.moderate,
    ease: easing.easeOut,
  } as Transition,

  slow: {
    duration: duration.slow,
    ease: easing.easeOut,
  } as Transition,

  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
  } as Transition,

  springBouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 15,
  } as Transition,

  springGentle: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
  } as Transition,
} as const

/* ==========================================================================
   FADE VARIANTS
   ========================================================================== */

export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: transition.normal,
  },
  exit: {
    opacity: 0,
    transition: transition.fast,
  },
}

export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: transition.fast,
  },
}

export const fadeInDown: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: transition.fast,
  },
}

export const fadeInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: transition.fast,
  },
}

export const fadeInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: transition.fast,
  },
}

/* ==========================================================================
   SCALE VARIANTS
   ========================================================================== */

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: transition.fast,
  },
}

export const scaleInBounce: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transition.springBouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: transition.fast,
  },
}

export const popIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transition.spring,
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: transition.fast,
  },
}

/* ==========================================================================
   SLIDE VARIANTS
   ========================================================================== */

export const slideInRight: Variants = {
  hidden: {
    x: '100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: transition.normal,
  },
}

export const slideInLeft: Variants = {
  hidden: {
    x: '-100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
    },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: transition.normal,
  },
}

export const slideInUp: Variants = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
    },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: transition.normal,
  },
}

export const slideInDown: Variants = {
  hidden: {
    y: '-100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
    },
  },
  exit: {
    y: '-100%',
    opacity: 0,
    transition: transition.normal,
  },
}

/* ==========================================================================
   STAGGER CONTAINERS
   ========================================================================== */

export const staggerContainer: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

export const staggerContainerFast: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
}

export const staggerContainerSlow: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

/* ==========================================================================
   STAGGER ITEMS (à utiliser avec staggerContainer)
   ========================================================================== */

export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
    },
  },
}

export const staggerItemScale: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transition.spring,
  },
}

export const staggerItemLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
    },
  },
}

/* ==========================================================================
   HOVER & TAP ANIMATIONS
   ========================================================================== */

export const hoverScale: TargetAndTransition = {
  scale: 1.05,
  transition: transition.fast,
}

export const hoverScaleSmall: TargetAndTransition = {
  scale: 1.02,
  transition: transition.fast,
}

export const tapScale: TargetAndTransition = {
  scale: 0.98,
  transition: { duration: 0.05 },
}

export const hoverLift: TargetAndTransition = {
  y: -4,
  transition: transition.normal,
}

export const hoverGlow = (color: string = 'var(--primary)'): TargetAndTransition => ({
  boxShadow: `0 0 40px -10px ${color}`,
  transition: transition.moderate,
})

/* ==========================================================================
   PAGE TRANSITIONS
   ========================================================================== */

export const pageTransition: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
      when: 'beforeChildren',
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
}

export const pageSlideUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.slow,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: duration.moderate,
      ease: easing.easeIn,
    },
  },
}

/* ==========================================================================
   MODAL & OVERLAY VARIANTS
   ========================================================================== */

export const modalOverlay: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
}

export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transition.spring,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: transition.fast,
  },
}

export const drawerContent: Variants = {
  hidden: {
    x: '100%',
  },
  visible: {
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: '100%',
    transition: {
      duration: duration.normal,
      ease: easing.easeIn,
    },
  },
}

/* ==========================================================================
   LIST ANIMATIONS
   ========================================================================== */

export const listContainer: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.05,
    },
  },
}

export const listItem: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: duration.fast,
    },
  },
}

/* ==========================================================================
   NOTIFICATION / TOAST VARIANTS
   ========================================================================== */

export const toastSlideIn: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transition.spring,
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: transition.fast,
  },
}

/* ==========================================================================
   SKELETON / LOADING ANIMATIONS
   ========================================================================== */

export const shimmer: Variants = {
  hidden: {
    backgroundPosition: '-200% 0',
  },
  visible: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    },
  },
}

export const pulse: Variants = {
  hidden: {
    opacity: 0.5,
  },
  visible: {
    opacity: 1,
    transition: {
      repeat: Infinity,
      repeatType: 'reverse',
      duration: 1,
      ease: 'easeInOut',
    },
  },
}

/* ==========================================================================
   UTILITY FUNCTIONS
   ========================================================================== */

/**
 * Crée un variant fadeInUp avec un délai personnalisé
 */
export const fadeInUpWithDelay = (delay: number): Variants => ({
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.moderate,
      ease: easing.easeOut,
      delay,
    },
  },
})

/**
 * Crée un stagger container avec des options personnalisées
 */
export const createStaggerContainer = (
  staggerDelay: number = 0.1,
  initialDelay: number = 0
): Variants => ({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: initialDelay,
    },
  },
})

/**
 * Props communes pour les éléments animés
 */
export const motionProps = {
  initial: 'hidden' as const,
  animate: 'visible' as const,
  exit: 'exit' as const,
}

/**
 * Props pour les éléments qui s'animent à l'entrée dans le viewport
 */
export const viewportMotionProps = {
  initial: 'hidden' as const,
  whileInView: 'visible' as const,
  viewport: { once: true, margin: '-100px' },
}
