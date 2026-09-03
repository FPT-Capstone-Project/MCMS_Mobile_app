import { ViewStyle } from 'react-native';

/**
 * Cross-platform Elevation & Shadow tokens
 * Includes both native React Native ViewStyle shadows and CSS boxShadow strings.
 */

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,

  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,

  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,

  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  } as ViewStyle,

  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  } as ViewStyle,
} as const;

export const boxshadows = {
  none: 'none',
  subtle: '0 1px 2px rgba(15, 23, 42, 0.04)',
  card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
  raised: '0 4px 12px rgba(15, 23, 42, 0.08)',
  overlay: '0 8px 24px rgba(15, 23, 42, 0.16)',
} as const;

export type Shadows = typeof shadows;
export type ShadowKey = keyof typeof shadows;
export type BoxShadows = typeof boxshadows;
