/**
 * Application Color System
 * Tailored for the SmartMush MCMS Mobile ecosystem (Smart Mushroom & IoT monitoring).
 * Features rich botanical greens, spore amber accents, crisp slate neutrals, and accessible semantic roles.
 */

export const colors = {
  // Brand / Primary Palette (Botanical & chamber greens)
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

  // Secondary / Accent Palette (Warm spore golden amber)
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

  // Neutrals / Slate Scale
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
    secondary: '#F1F5F9',
  },

  // Text Roles
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

  // Semantic Shortcut Tokens
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceElevated: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  textDisabled: '#CBD5E1',
  borderDefault: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocus: '#2E7D32',
  primaryMain: '#2E7D32',
  primaryPressed: '#1F5A23',
  primaryLight: '#E8F5E9',
  secondaryMain: '#FFA000',
  secondaryPressed: '#F57C00',
  secondaryLight: '#FFF8E1',

  // Disabled State Tokens
  disabled: {
    background: '#F1F5F9',
    text: '#94A3B8',
    border: '#E2E8F0',
  },

  // Utilities
  transparent: 'transparent',
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const;

export type Colors = typeof colors;
