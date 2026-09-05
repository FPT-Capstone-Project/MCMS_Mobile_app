import { AuthSession, AuthTokens, AuthUser } from '../../domain/entities/AuthUser';

/**
 * Mock & Demo Authentication Data
 * Used for development testing and offline fallback matching the SmartMush ecosystem.
 */

export const MOCK_AUTH_TOKENS: AuthTokens = {
  accessToken: 'smartmush_demo_jwt_access_token_customer_tier',
  refreshToken: 'smartmush_demo_jwt_refresh_token_customer_tier',
  tokenType: 'Bearer',
  expiresIn: 86400,
};

export const MOCK_CUSTOMER_USER: AuthUser = {
  id: 'CUST-8839',
  email: 'khachhang@smartmush.vn',
  fullName: 'Nguyễn Văn An',
  phoneNumber: '0912345678',
  role: 'CUSTOMER',
  avatarUrl: undefined,
  createdAt: '2026-01-15T08:00:00Z',
};

export const MOCK_AUTH_SESSION: AuthSession = {
  user: MOCK_CUSTOMER_USER,
  tokens: MOCK_AUTH_TOKENS,
};
