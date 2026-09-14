import { AuthSession, AuthTokens, AuthUser, LoginCredentials } from '../../domain/entities/AuthUser';

/**
 * ============================================================================
 * DEMO ONLY — REMOVE BEFORE PRODUCTION
 * 
 * Hard-coded credentials and local mock session for Shipper role demonstration.
 * This demo authentication is strictly for local development and testing.
 * DO NOT use, deploy, or connect this mock account to production authorization!
 * ============================================================================
 */

export const DEMO_SHIPPER_CREDENTIALS = {
  email: 'lekhoi@gmail.com',
  password: '123456',
  role: 'SHIPPER' as const,
};

export const DEMO_SHIPPER_USER: AuthUser = {
  id: 'DEMO-SHIPPER-001',
  email: 'lekhoi@gmail.com',
  fullName: 'Lê Khôi (Shipper)',
  phoneNumber: '0901234567',
  role: 'SHIPPER',
  createdAt: '2026-09-15T00:00:00Z',
};

export const DEMO_SHIPPER_TOKENS: AuthTokens = {
  accessToken: 'smartmush_demo_jwt_access_token_shipper_tier',
  refreshToken: 'smartmush_demo_jwt_refresh_token_shipper_tier',
  tokenType: 'Bearer',
  expiresIn: 86400,
};

export const DEMO_SHIPPER_SESSION: AuthSession = {
  user: DEMO_SHIPPER_USER,
  tokens: DEMO_SHIPPER_TOKENS,
};

/**
 * Checks if the given email corresponds to the demo shipper account.
 */
export function isDemoShipperEmail(email: string): boolean {
  return email.trim().toLowerCase() === DEMO_SHIPPER_CREDENTIALS.email.toLowerCase();
}

/**
 * Validates whether the supplied login credentials match the demo shipper account.
 */
export function validateDemoShipperCredentials(credentials: LoginCredentials): boolean {
  const emailMatches = isDemoShipperEmail(credentials.email);
  const passwordMatches = credentials.password === DEMO_SHIPPER_CREDENTIALS.password;
  return emailMatches && passwordMatches;
}

/**
 * Returns a clone of the demo shipper session object.
 */
export function getDemoShipperSession(): AuthSession {
  return {
    user: { ...DEMO_SHIPPER_USER },
    tokens: { ...DEMO_SHIPPER_TOKENS },
  };
}
