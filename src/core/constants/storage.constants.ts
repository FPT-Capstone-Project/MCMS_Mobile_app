/**
 * Storage keys for SecureStore and application persistence
 */

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'mcms_access_token',
  REFRESH_TOKEN: 'mcms_refresh_token',
  USER_SESSION: 'mcms_user_session',
  THEME_MODE: 'mcms_theme_mode',
  LANGUAGE: 'mcms_language',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
