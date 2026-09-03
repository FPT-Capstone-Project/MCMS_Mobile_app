/**
 * Layout and Dimension Design Tokens
 * Centralized sizing for consistent touch targets, icon sizes, and component dimensions.
 */

export const layout = {
  // Minimum touch target sizes (Apple HIG & Material Design standard >= 44x44)
  minTouchTarget: 44,

  // Component heights
  heights: {
    buttonSm: 36,
    buttonMd: 48,
    buttonLg: 54,
    inputSm: 40,
    inputMd: 48,
    inputLg: 54,
    header: 56,
    tabBar: 62,
    iconButtonSm: 36,
    iconButtonMd: 44,
    iconButtonLg: 52,
  },

  // Icon sizing scale
  iconSizes: {
    xs: 14,
    sm: 18,
    md: 22,
    lg: 26,
    xl: 32,
    xxl: 44,
    hero: 64,
  },

  // Screen horizontal margins
  screenPadding: {
    compact: 12,
    normal: 16,
    spacious: 20,
  },
} as const;

export type Layout = typeof layout;
