export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

export type UserRole = 'CUSTOMER' | 'SHIPPER' | 'FARM_OPERATOR' | 'ADMIN';

export interface BackendUser {
  user_id: number;
  role_id: number;
  email: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  role?: string | { role_id?: number; role_name?: string };
  role_name?: string;
}

export interface AuthUser {
  id: string;
  user_id?: number;
  role_id?: number;
  email: string;
  fullName: string;
  full_name?: string;
  phoneNumber?: string;
  phone?: string | null;
  address?: string | null;
  role?: UserRole;
  status?: string;
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

export interface RegisterOtpData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export type RegisterData = RegisterOtpData;

export interface VerifyRegistrationOtpData {
  email: string;
  otp: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  new_password: string;
}

export interface ChangePasswordOtpData {
  otp: string;
  new_password: string;
}

export interface AuthResponseDto {
  message?: string;
  token: string;
  user: BackendUser;
}

export interface GenericAuthResponse {
  success?: boolean;
  message: string;
}
