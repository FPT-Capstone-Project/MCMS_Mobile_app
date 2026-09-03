/**
 * Motion and Animation Design Tokens
 * Used with React Native Reanimated and Animated primitives for consistent app physics.
 */

export const motion = {
  // Durations (in milliseconds)
  duration: {
    instant: 100,
    fast: 150, // Micro-interactions: button press, chip toggle, icon change
    base: 250, // Normal transitions: accordion expand, dialog fade, badge pop
    slow: 400, // Large scene changes: bottom sheet entrance, tab swap
    extraSlow: 600,
  },

  // Spring physics configs
  spring: {
    gentle: {
      damping: 20,
      mass: 1,
      stiffness: 120,
      overshootClamping: false,
    },
    default: {
      damping: 15,
      mass: 1,
      stiffness: 150,
      overshootClamping: false,
    },
    bouncy: {
      damping: 10,
      mass: 0.9,
      stiffness: 180,
      overshootClamping: false,
    },
    stiff: {
      damping: 26,
      mass: 1,
      stiffness: 260,
      overshootClamping: true,
    },
  },
} as const;

export type Motion = typeof motion;
