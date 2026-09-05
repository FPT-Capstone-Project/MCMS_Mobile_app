/**
 * Centralized API Endpoints Map
 * All API routes are defined here to eliminate hardcoding.
 */

export const API_ENDPOINTS = {
  // Authentication & Profile
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  // Trays
  TRAYS: {
    BASE: '/trays',
    DETAIL: (id: string | number) => `/trays/${id}`,
    STATUS: (id: string | number) => `/trays/${id}/status`,
  },
  // Rentals
  RENTALS: {
    BASE: '/rentals',
    DETAIL: (id: string | number) => `/rentals/${id}`,
    CALCULATE_PRICE: '/rentals/calculate-price',
  },
  // Orders & Payment
  ORDERS: {
    BASE: '/orders',
    DETAIL: (id: string | number) => `/orders/${id}`,
  },
  // Monitoring & Telemetry
  MONITORING: {
    METRICS: (trayId: string | number) => `/monitoring/trays/${trayId}/metrics`,
    LOGS: (trayId: string | number) => `/monitoring/trays/${trayId}/logs`,
  },
  // Notifications
  NOTIFICATIONS: {
    BASE: '/notifications',
    MARK_READ: (id: string | number) => `/notifications/${id}/read`,
  },
} as const;
