/**
 * Application Spacing System (4px / 8px baseline grid)
 */

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  '2xl': 32,
  xxxl: 40,
  '3xl': 40,
  huge: 48,
  massive: 64,

  // Layout context helpers
  screenHorizontal: 16,
  screenHorizontalLg: 20,
  screenVertical: 16,
  cardPadding: 16,
  sectionGap: 24,
} as const;

export type Spacing = typeof spacing;
export type SpacingKey = keyof typeof spacing;
