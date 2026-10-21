import {
  AuthSession,
  AuthUser,
  ChangePasswordOtpData,
  ForgotPasswordData,
  GenericAuthResponse,
  LoginCredentials,
  RegisterOtpData,
  ResetPasswordData,
  VerifyRegistrationOtpData,
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
   * Register customer with OTP sent to email
   */
  registerOtp(data: RegisterOtpData): Promise<GenericAuthResponse>;

  /**
   * Verify email registration OTP
   */
  verifyRegistrationOtp(data: VerifyRegistrationOtpData): Promise<GenericAuthResponse>;

  /**
   * Request a password reset OTP
   */
  forgotPassword(data: ForgotPasswordData): Promise<GenericAuthResponse>;

  /**
   * Submit OTP and reset password
   */
  resetPassword(data: ResetPasswordData): Promise<GenericAuthResponse>;

  /**
   * Request OTP to change password when authenticated
   */
  requestChangePasswordOtp(): Promise<GenericAuthResponse>;

  /**
   * Change password with OTP when authenticated
   */
  changePasswordOtp(data: ChangePasswordOtpData): Promise<GenericAuthResponse>;

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
