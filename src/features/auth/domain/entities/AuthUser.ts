/**
 * Authentication Domain Entities & DTOs
 * Pure domain interfaces independent of UI, Redux, and framework logic.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

export type UserRole = 'CUSTOMER' | 'SHIPPER' | 'FARM_OPERATOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role?: UserRole;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  newPassword: string;
}

export interface AuthResponseDto {
  user: AuthUser;
  tokens: AuthTokens;
  message?: string;
}

export interface GenericAuthResponse {
  success: boolean;
  message: string;
}
