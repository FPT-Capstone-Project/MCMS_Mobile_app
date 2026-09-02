/**
 * Application environment configuration
 * Centralizes environment variables, API configurations, and operational constants.
 */

export interface AppEnvConfig {
  apiUrl: string;
  apiTimeout: number;
  environment: 'development' | 'staging' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;
}

const isDev = process.env.NODE_ENV !== 'production';

export const ENV: AppEnvConfig = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.smartmush.com/api/v1',
  apiTimeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT) || 15000,
  environment: (process.env.EXPO_PUBLIC_APP_ENV as AppEnvConfig['environment']) || (isDev ? 'development' : 'production'),
  isDevelopment: isDev,
  isProduction: !isDev,
};
