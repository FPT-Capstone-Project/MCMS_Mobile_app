import { borderRadius } from './borderRadius';
import { colors } from './colors';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { fontSizes, fontWeights, lineHeights, textVariants } from './typography';

/**
 * Unified Application Theme Object
 */
export const theme = {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography: {
    fontSizes,
    lineHeights,
    fontWeights,
    variants: textVariants,
  },
} as const;

export type Theme = typeof theme;
