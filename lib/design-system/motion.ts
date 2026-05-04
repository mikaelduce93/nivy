/* ==========================================================================
   MOTION DESIGN SYSTEM - Linear-Quality Animations
   
   Consistent, performant, accessible motion across the entire app.
   All animations respect prefers-reduced-motion.
   ========================================================================== */

import type { Variants, Transition, TargetAndTransition } from 'framer-motion'
import { duration, easing, springPresets } from './tokens'

/**
 * Standard transition presets
 */
export const transitions = {
  /** Instant feedback - button press */
  instant: {
    duration: duration.instant / 1000,
    ease: 'linear',
  },
  
  /** Fast - hover states, tooltips */
  fast: {
    duration: duration.fast / 1000,
    ease: [0.4, 0, 0.2, 1], // smooth
  },
  
  /** Default - most transitions */
  default: {
    duration: duration.normal / 1000,
    ease: [0.4, 0, 0.2, 1],
  },
  
  /** Slow - modals, major state changes */
  slow: {
    duration: duration.slow / 1000,
    ease: [0.4, 0, 0.2, 1],
  },
  
  /** Spring - playful, bouncy */
  spring: {
    type: 'spring' as const,
    ...springPresets.default,
  },
  
  /** Bouncy spring - celebrations */
  bouncy: {
    type: 'spring' as const,
    ...springPresets.bouncy,
  },
  
  /** Snappy spring - quick response */
  snappy: {
    type: 'spring' as const,
    ...springPresets.snappy,
  },
} satisfies Record<string, Transition>

/**
 * Card animations - entrance and interactions
 */
export const cardMotion = {
  /** Card entrance animation */
  enter: {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
    },
    transition: {
      duration: 0.35,
      ease: [0.34, 1.56, 0.64, 1], // spring easing
    },
  },
  
  /** Card exit animation */
  exit: {
    exit: { 
      opacity: 0, 
      y: -10, 
      scale: 0.98,
      transition: { duration: 0.2 }
    },
  },
  
  /** Subtle hover lift - no layout shift */
  hover: {
    whileHover: { 
      y: -4,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
  },
  
  /** Hover with shadow */
  hoverShadow: {
    whileHover: { 
      y: -4,
      boxShadow: '0 20px 40px -15px oklch(0 0 0 / 0.2)',
      transition: { duration: 0.2, ease: 'easeOut' }
    },
  },
  
  /** Tap feedback */
  tap: {
    whileTap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    },
  },
} as const

/**
 * Framer Motion Variants for cards
 */
export const cardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
    scale: 0.98 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.34, 1.56, 0.64, 1],
    }
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.98,
    transition: { duration: 0.2 }
  },
}

/**
 * Stagger animations for lists
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    }
  }
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.34, 1.56, 0.64, 1],
    }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.15 }
  }
}

/**
 * Fade animations
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
}

/**
 * Slide animations
 */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    }
  },
  exit: { 
    opacity: 0, 
    y: -16,
    transition: { duration: 0.25 }
  }
}

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -24 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    }
  },
  exit: { 
    opacity: 0, 
    y: 16,
    transition: { duration: 0.25 }
  }
}

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    }
  },
  exit: { 
    opacity: 0, 
    x: -24,
    transition: { duration: 0.25 }
  }
}

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    }
  },
  exit: { 
    opacity: 0, 
    x: 24,
    transition: { duration: 0.25 }
  }
}

/**
 * Scale animations
 */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring',
      ...springPresets.default,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
}

/**
 * Micro-interactions - reusable motion presets
 */
export const microInteractions = {
  /** Button press - tactile feedback */
  buttonPress: {
    whileTap: { scale: 0.97 },
    transition: { duration: 0.1 },
  } as TargetAndTransition & { whileTap: TargetAndTransition },
  
  /** Icon hover - slight scale */
  iconHover: {
    whileHover: { scale: 1.1 },
    transition: { duration: 0.15 },
  } as TargetAndTransition & { whileHover: TargetAndTransition },
  
  /** Icon tap - playful bounce */
  iconTap: {
    whileTap: { scale: 0.9, rotate: -5 },
    transition: { duration: 0.1 },
  } as TargetAndTransition & { whileTap: TargetAndTransition },
  
  /** Link hover - subtle lift */
  linkHover: {
    whileHover: { y: -1 },
    transition: { duration: 0.15 },
  } as TargetAndTransition & { whileHover: TargetAndTransition },
  
  /** Glow pulse - attention */
  glowPulse: {
    animate: {
      opacity: [0.5, 1, 0.5],
      scale: [1, 1.05, 1],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  
  /** Shimmer - loading/success */
  shimmer: {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
  
  /** Float - ambient movement */
  float: {
    animate: {
      y: [0, -8, 0],
    },
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  
  /** Rotate - continuous spin */
  spin: {
    animate: {
      rotate: 360,
    },
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
} as const

/**
 * Page transition variants
 */
export const pageTransition: Variants = {
  initial: { 
    opacity: 0,
    y: 8,
  },
  animate: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    }
  },
  exit: { 
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 1, 1],
    }
  }
}

/**
 * Modal animations
 */
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15 }
  }
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
    transition: {
      type: 'spring',
      ...springPresets.snappy,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.98,
    transition: { duration: 0.15 }
  }
}

/**
 * Number counter animation config
 */
export const counterConfig = {
  duration: 1.5,
  delay: 0.2,
  ease: [0.25, 0.1, 0.25, 1],
}

/**
 * Skeleton shimmer animation
 */
export const skeletonShimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear',
  },
}

/**
 * Get motion-safe variants
 * Returns instant transitions when reduced motion is preferred
 */
export function getReducedMotionVariants(
  variants: Variants,
  prefersReducedMotion: boolean
): Variants {
  if (!prefersReducedMotion) return variants
  
  // Return variants with instant transitions
  const reducedVariants: Variants = {}
  
  for (const [key, value] of Object.entries(variants)) {
    if (typeof value === 'object' && value !== null) {
      reducedVariants[key] = {
        ...value,
        transition: { duration: 0 },
      }
    } else {
      reducedVariants[key] = value
    }
  }
  
  return reducedVariants
}

/**
 * CSS keyframe animations (for non-JS contexts)
 */
export const cssAnimations = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  @keyframes shimmer {
    from { background-position: 200% 0; }
    to { background-position: -200% 0; }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  
  /* Reduced motion overrides */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`

export default {
  transitions,
  cardMotion,
  cardVariants,
  staggerContainer,
  staggerItem,
  fadeVariants,
  slideUp,
  slideDown,
  slideLeft,
  slideRight,
  scaleIn,
  microInteractions,
  pageTransition,
  modalOverlay,
  modalContent,
  counterConfig,
  skeletonShimmer,
  getReducedMotionVariants,
  cssAnimations,
}
