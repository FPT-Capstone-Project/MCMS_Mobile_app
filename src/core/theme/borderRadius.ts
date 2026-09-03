/**
 * Application Border Radius Scale
 */

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  base: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  full: 9999,

  // Component semantic radii
  card: 16,
  button: 12,
  input: 10,
  chip: 8,
  pill: 9999,
} as const;

export type BorderRadius = typeof borderRadius;
export type BorderRadiusKey = keyof typeof borderRadius;
