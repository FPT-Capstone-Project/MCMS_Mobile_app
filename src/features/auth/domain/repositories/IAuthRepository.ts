import {
  AuthSession,
  AuthUser,
  ForgotPasswordData,
  GenericAuthResponse,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
} from '../entities/AuthUser';

/**
 * Authentication Repository Interface
 * Defines the contract for authentication operations according to Clean Architecture.
 */
export interface IAuthRepository {
  /**
   * Authenticate customer with email and password
   */
  login(credentials: LoginCredentials): Promise<AuthSession>;

  /**
   * Register a new customer account
   */
  register(data: RegisterData): Promise<AuthSession>;

  /**
   * Request a password reset email/code
   */
  forgotPassword(data: ForgotPasswordData): Promise<GenericAuthResponse>;

  /**
   * Submit OTP and reset password
   */
  resetPassword(data: ResetPasswordData): Promise<GenericAuthResponse>;

  /**
   * Fetch current authenticated customer profile from backend
   */
  getCurrentUser(): Promise<AuthUser>;

  /**
   * Log out customer, clearing session tokens and local credentials
   */
  logout(): Promise<void>;

  /**
   * Restore stored session and tokens from SecureStore on app initialization
   */
  restoreSession(): Promise<AuthSession | null>;
}
