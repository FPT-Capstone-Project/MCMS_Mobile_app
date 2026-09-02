import { theme, Theme } from '../../core/theme';

/**
 * useTheme Hook
 * Returns the application theme tokens for consistent styling across components.
 */
export function useTheme(): Theme {
  return theme;
}
