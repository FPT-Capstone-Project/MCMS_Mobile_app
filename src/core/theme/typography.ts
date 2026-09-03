import { TextStyle } from 'react-native';

/**
 * Application Typography System
 * Standardized font scale, line heights, font weights, and text variant definitions.
 */

export const fontSizes = {
  xxs: 10,
  xs: 11,
  sm: 12,
  smMed: 13,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  xxl: 20,
  h2: 24,
  h1: 28,
  display: 34,
} as const;

export const lineHeights = {
  xxs: 12,
  xs: 14,
  sm: 16,
  smMed: 18,
  md: 20,
  base: 22,
  lg: 24,
  xl: 26,
  xxl: 28,
  h2: 30,
  h1: 34,
  display: 40,
} as const;

export const fontWeights = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  heavy: '800' as TextStyle['fontWeight'],
} as const;

export const textVariants = {
  display: {
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
    fontWeight: fontWeights.bold,
  },
  h1: {
    fontSize: fontSizes.h1,
    lineHeight: lineHeights.h1,
    fontWeight: fontWeights.bold,
  },
  h2: {
    fontSize: fontSizes.h2,
    lineHeight: lineHeights.h2,
    fontWeight: fontWeights.bold,
  },
  h3: {
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
    fontWeight: fontWeights.semibold,
  },
  title: {
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semibold,
  },
  subtitle: {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.medium,
  },
  body: {
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
  },
  bodyMedium: {
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.medium,
  },
  bodySmall: {
    fontSize: fontSizes.smMed,
    lineHeight: lineHeights.smMed,
    fontWeight: fontWeights.regular,
  },
  bodySmallMedium: {
    fontSize: fontSizes.smMed,
    lineHeight: lineHeights.smMed,
    fontWeight: fontWeights.medium,
  },
  caption: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
  },
  captionMedium: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.medium,
  },
  label: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.semibold,
  },
  button: {
    fontSize: fontSizes.base,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.semibold,
  },
  buttonSm: {
    fontSize: fontSizes.smMed,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.semibold,
  },
  overline: {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase' as TextStyle['textTransform'],
    letterSpacing: 0.8,
  },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;

export type Typography = {
  fontSizes: typeof fontSizes;
  lineHeights: typeof lineHeights;
  fontWeights: typeof fontWeights;
  variants: typeof textVariants;
};
