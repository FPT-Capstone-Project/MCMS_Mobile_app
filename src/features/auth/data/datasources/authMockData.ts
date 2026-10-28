import { AuthSession, AuthTokens, AuthUser } from '../../domain/entities/AuthUser';

/**
 * Redirect demo/mock data to empty values so real authentication always depends on backend-issued tokens.
 */
export const MOCK_AUTH_TOKENS: AuthTokens = {
  accessToken: '',
  refreshToken: '',
  tokenType: 'Bearer',
  expiresIn: 0,
};

export const MOCK_CUSTOMER_USER: AuthUser = {
  id: 'guest',
  email: '',
  fullName: 'Guest User',
  phoneNumber: undefined,
  role: 'CUSTOMER',
  createdAt: new Date(0).toISOString(),
};

export const MOCK_AUTH_SESSION: AuthSession = {
  user: MOCK_CUSTOMER_USER,
  tokens: MOCK_AUTH_TOKENS,
};
