/**
 * Application Color Palette
 * Designed specifically for the SmartMush MCMS Mobile ecosystem.
 */

export const colors = {
  // Brand / Primary (Earthy mushroom & botanical greens)
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#2E7D32', // Main Brand Green
    600: '#286E2C',
    700: '#1F5A23',
    800: '#17471B',
    900: '#0E3012',
  },

  // Secondary / Accent (Warm spore golden amber)
  secondary: {
    50: '#FFF8E1',
    100: '#FFECB3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: '#FFA000', // Warm Amber
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },

  // Neutrals / Grays
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Semantic Status Colors
  success: {
    light: '#E8F5E9',
    main: '#2E7D32',
    dark: '#1B5E20',
    text: '#0E3E12',
  },
  warning: {
    light: '#FFF3E0',
    main: '#ED6C02',
    dark: '#C75B00',
    text: '#7A3800',
  },
  error: {
    light: '#FFEBEE',
    main: '#D32F2F',
    dark: '#C62828',
    text: '#5F1414',
  },
  info: {
    light: '#E1F5FE',
    main: '#0288D1',
    dark: '#01579B',
    text: '#013660',
  },

  // Background & Surface
  background: {
    default: '#F8FAFC',
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
    subtle: '#F1F5F9',
  },

  // Text
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
    disabled: '#CBD5E1',
  },

  // Border & Dividers
  border: {
    light: '#F1F5F9',
    default: '#E2E8F0',
    focus: '#2E7D32',
    dark: '#CBD5E1',
  },

  // Transparent / Utility
  transparent: 'transparent',
  overlay: 'rgba(15, 23, 42, 0.5)',
} as const;

export type Colors = typeof colors;
