import { borderRadius } from './borderRadius';
import { colors } from './colors';
import { layout } from './layout';
import { motion } from './motion';
import { boxshadows, shadows } from './shadows';
import { spacing } from './spacing';
import { fontSizes, fontWeights, lineHeights, textVariants } from './typography';

/**
 * Unified Application Theme Object
 * Single source of truth for design tokens across SmartMush MCMS Mobile.
 */
export const theme = {
  colors,
  spacing,
  borderRadius,
  shadows,
  boxshadows,
  motion,
  layout,
  typography: {
    fontSizes,
    lineHeights,
    fontWeights,
    variants: textVariants,
  },
} as const;

export type Theme = typeof theme;
