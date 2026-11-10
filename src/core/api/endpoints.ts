/**
 * Centralized API Endpoints Map
 * All API routes are defined here to eliminate hardcoding.
 */

export const API_ENDPOINTS = {
  // Authentication & Profile
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REGISTER_OTP: '/api/auth/register-otp',
    VERIFY_REGISTRATION_OTP: '/api/auth/verify-registration-otp',
    ME: '/api/auth/me',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD_OTP: '/api/auth/reset-password-otp',
    REQUEST_CHANGE_PASSWORD_OTP: '/api/auth/request-change-password-otp',
    CHANGE_PASSWORD_OTP: '/api/auth/change-password-otp',
  },
  USERS: {
    ME: '/api/users/me',
  },
  NOTIFICATIONS: {
    BASE: '/api/notifications',
    READ_ALL: '/api/notifications/read-all',
    READ: (notificationId: number) => `/api/notifications/${notificationId}/read`,
    CONFIRM_REPAIR: (notificationId: number | string) =>
      `/api/notifications/${notificationId}/confirm-repair`,
  },
  // Cultivation Rooms
  ROOMS: {
    BASE: '/api/cultivation-rooms',
    DETAIL: (id: string | number) => `/api/cultivation-rooms/${id}`,
  },
  // Cultivation Trays
  TRAYS: {
    BASE: '/api/cultivation-trays',
    DETAIL: (id: string | number) => `/api/cultivation-trays/${id}`,
  },
  // Mushroom Types
  MUSHROOM_TYPES: {
    BASE: '/api/mushroom-types',
    DETAIL: (id: string | number) => `/api/mushroom-types/${id}`,
  },
  // Mushroom Conditions
  MUSHROOM_CONDITIONS: {
    BASE: '/api/mushroom-conditions',
    DETAIL: (id: string | number) => `/api/mushroom-conditions/${id}`,
  },
  // Rental Packages
  // Rental Packages & Admin Rentals
  RENTAL_PACKAGES: {
    BASE: '/api/rental-packages',
    DETAIL: (id: string | number) => `/api/rental-packages/${id}`,
  },
  RENTALS: {
    ADMIN_LIST: '/api/rentals/admin',
    ADMIN_DETAIL: (rentalId: number | string) => `/api/rentals/admin/${rentalId}`,
    ADMIN_START_CULTIVATION: (rentalId: number | string) =>
      `/api/rentals/admin/${rentalId}/cultivation-session`,
  },
  // Orders
  ORDERS: {
    BASE: '/api/orders',
    DETAIL: (id: string | number) => `/api/orders/${id}`,
    CULTIVATION: '/api/orders/cultivation',
    CANCEL: (orderId: string | number) => `/api/orders/${orderId}/cancel`,
  },
  CUSTOMER: {
    CULTIVATION_STATUS: (orderId: string | number) =>
      `/api/customer/orders/${orderId}/cultivation-status`,
    CULTIVATION_PROGRESS: (orderId: string | number) =>
      `/api/customer/orders/${orderId}/cultivation-progress`,
  },
  // Payments (PayOS)
  PAYMENTS: {
    PAYOS: (orderId: string | number) => `/api/payments/orders/${orderId}/payos`,
    STATUS: (orderId: string | number) => `/api/payments/orders/${orderId}/status`,
    SYNC: (orderId: string | number) => `/api/payments/orders/${orderId}/payos/sync`,
    /** @deprecated Use PAYOS instead */
    SEPAY_QR: (orderId: string | number) => `/api/payments/orders/${orderId}/payos`,
  },
  CAMERAS: {
    IMOU_PLAYER_TOKEN: (cameraId: number) => `/api/cameras/${cameraId}/imou-player-token`,
    LIVE_STREAM: (cameraId: number) => `/api/cameras/${cameraId}/live-stream`,
    STOP_LIVE_STREAM: (cameraId: number) => `/api/cameras/${cameraId}/live-stream/stop`,
  },
  // IoT Masters, Sensors, SSR
  IOT: {
    MASTERS: '/api/iot/masters',
    MASTER_SENSORS: (masterId: string) => `/api/iot/masters/${masterId}/sensors`,
    NODE_SENSOR: (masterId: string, nodeId: number, sensorId: number) =>
      `/api/iot/masters/${masterId}/nodes/${nodeId}/sensors/${sensorId}`,
    SENSOR_HISTORY: (masterId: string, nodeId: number, sensorId: number) =>
      `/api/iot/masters/${masterId}/nodes/${nodeId}/sensors/${sensorId}/history`,
    SSR: (masterId: string) => `/api/iot/masters/${masterId}/ssr`,
    SSR_COMMAND: (masterId: string, channel: number) =>
      `/api/iot/masters/${masterId}/ssr/${channel}/commands`,
    COMMAND_STATUS: (commandId: string) => `/api/iot/commands/${commandId}`,
    MASTER_LIGHT: (masterId: string) => `/api/iot/masters/${masterId}/light`,
  },
  // Automatic Misting & Floors
  AUTOMATIC: {
    FLOORS: '/api/iot/floors',
    FLOOR_DETAIL: (floorId: number) => `/api/iot/floors/${floorId}`,
    FLOOR_FAN: (floorId: number) => `/api/iot/floors/${floorId}/fan`,
    GENERATE_TRAYS: (floorId: number) => `/api/iot/floors/${floorId}/trays/generate`,
    ASSIGN_TRAY: (floorId: number, trayId: number) =>
      `/api/iot/floors/${floorId}/trays/${trayId}`,
    ENVIRONMENT: (floorId: number) => `/api/iot/floors/${floorId}/environment`,
    AUTO_CONTROL: (floorId: number) => `/api/iot/floors/${floorId}/auto-control`,
    SUGGESTIONS: (floorId: number) => `/api/iot/floors/${floorId}/auto-control/suggestions`,
    EVALUATE: (floorId: number) => `/api/iot/floors/${floorId}/auto-control/evaluate`,
    START: (floorId: number) => `/api/iot/floors/${floorId}/auto-control/start`,
    STOP: (floorId: number) => `/api/iot/floors/${floorId}/auto-control/stop`,
    STATUS: (floorId: number) => `/api/iot/floors/${floorId}/auto-control/status`,
    LOGS: (floorId: number) => `/api/iot/floors/${floorId}/auto-control/logs`,
  },
  // Farm Spawn Workflow & Cultivation Lifecycle
  FARM: {
    SESSIONS: '/api/farm/sessions',
    SESSION_DETAIL: (sessionId: number | string) => `/api/farm/sessions/${sessionId}`,
    SESSION_STAGE: (sessionId: number | string) => `/api/farm/sessions/${sessionId}/stage`,
    SPAWN_INSPECTIONS: (sessionId: number | string) =>
      `/api/farm/sessions/${sessionId}/spawn-inspections`,
    SPAWN_REPLACEMENTS: (inspectionId: number | string) =>
      `/api/farm/spawn-inspections/${inspectionId}/replacements`,
    SPAWN_IMAGES: (inspectionId: number | string) =>
      `/api/farm/spawn-inspections/${inspectionId}/images`,
  },
  // Cultivation Sessions (Admin & Operator)
  CULTIVATION_SESSIONS: {
    ADMIN_BASE: '/api/cultivation-sessions/admin',
    ADMIN_DETAIL: (sessionId: number | string) =>
      `/api/cultivation-sessions/admin/${sessionId}`,
    ADMIN_PROGRESS: (sessionId: number | string) =>
      `/api/cultivation-sessions/admin/${sessionId}/progress`,
    ADMIN_IOT_HISTORY: (sessionId: number | string) =>
      `/api/cultivation-sessions/admin/${sessionId}/iot-history`,
    ADMIN_IOT_SENSOR_HISTORY: (sessionId: number | string) =>
      `/api/cultivation-sessions/admin/${sessionId}/iot-history/sensors`,
    ADMIN_GROWTH: (sessionId: number | string) =>
      `/api/cultivation-sessions/admin/${sessionId}/growth`,
    ADMIN_HARVEST_READINESS: (sessionId: number | string) =>
      `/api/cultivation-sessions/admin/${sessionId}/harvest-readiness`,
    ADMIN_AVAILABLE_TRAYS: (floorId: number | string) =>
      `/api/cultivation-sessions/admin/available-trays?floorId=${floorId}`,
    ADMIN_ASSIGN_TRAYS: (sessionId: number | string) =>
      `/api/cultivation-sessions/admin/${sessionId}/trays`,
    ADMIN_SESSION_TRAY_INSPECTION: (sessionTrayId: number | string) =>
      `/api/cultivation-sessions/admin/session-trays/${sessionTrayId}/inspections`,
    ADMIN_INSPECTION_IMAGES: (inspectionId: number | string) =>
      `/api/cultivation-sessions/admin/inspections/${inspectionId}/images`,
    DAILY_INSPECTIONS: (sessionId: number | string) =>
      `/api/cultivation-sessions/${sessionId}/daily-inspections`,
    TRAY_DAILY_INSPECTIONS: (sessionId: number | string, sessionTrayId: number | string) =>
      `/api/cultivation-sessions/${sessionId}/trays/${sessionTrayId}/daily-inspections`,
  },
  // Harvests Workflow (Admin & Operator)
  HARVESTS: {
    CREATE: '/api/harvests',
    ADMIN_LIST: '/api/harvests/admin',
    DETAIL: (harvestId: number | string) => `/api/harvests/${harvestId}`,
    START: (harvestId: number | string) => `/api/harvests/${harvestId}/start`,
    YIELD: (harvestId: number | string) => `/api/harvests/${harvestId}/yield`,
    COMPLETE: (harvestId: number | string) => `/api/harvests/${harvestId}/complete`,
  },
  // Analytics & Aggregated Metrics
  ANALYTICS: {
    DASHBOARD: '/api/analytics/dashboard',
    ENVIRONMENT_HISTORY: '/api/analytics/dashboard/environment-history',
  },
} as const;
