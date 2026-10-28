import { AuthSession, AuthTokens, AuthUser, LoginCredentials } from '../../domain/entities/AuthUser';

/**
 * Demo authentication is intentionally disabled for all builds.
 * Real sessions must come from the backend and be stored only in SecureStore.
 */
export const AUTH_DEMO_MODE = false as const;

const EMPTY_TOKENS: AuthTokens = {
  accessToken: '',
  refreshToken: '',
  tokenType: 'Bearer',
  expiresIn: 0,
};

const EMPTY_SHIPPER_USER: AuthUser = {
  id: 'guest',
  email: '',
  fullName: 'Guest User',
  phoneNumber: undefined,
  role: 'CUSTOMER',
  createdAt: new Date(0).toISOString(),
};

export const DEMO_SHIPPER_CREDENTIALS = {
  email: '',
  password: '',
  role: 'SHIPPER' as const,
};

export const DEMO_SHIPPER_USER: AuthUser = EMPTY_SHIPPER_USER;

export const DEMO_SHIPPER_TOKENS: AuthTokens = EMPTY_TOKENS;

export const DEMO_SHIPPER_SESSION: AuthSession = {
  user: DEMO_SHIPPER_USER,
  tokens: DEMO_SHIPPER_TOKENS,
};

export function isDemoShipperEmail(_email: string): boolean {
  return false;
}

export function validateDemoShipperCredentials(_credentials: LoginCredentials): boolean {
  return false;
}

export function getDemoShipperSession(): AuthSession {
  return {
    user: { ...DEMO_SHIPPER_USER },
    tokens: { ...DEMO_SHIPPER_TOKENS },
  };
}
