import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { STORAGE_KEYS } from '../../../../core/constants/storage.constants';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import { secureStorage } from '../../../../core/storage/secureStorage';
import {
  AuthResponseDto,
  AuthSession,
  AuthTokens,
  AuthUser,
  BackendUser,
  ChangePasswordOtpData,
  ForgotPasswordData,
  GenericAuthResponse,
  LoginCredentials,
  RegisterOtpData,
  ResetPasswordData,
  VerifyRegistrationOtpData,
  UserRole,
} from '../../domain/entities/AuthUser';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository';

/**
 * Resolves precise UserRole from BackendUser data
 */
export function resolveUserRole(backendUser: BackendUser): UserRole {
  const rawRole = (
    typeof backendUser.role === 'string'
      ? backendUser.role
      : typeof backendUser.role === 'object' && backendUser.role !== null
      ? (backendUser.role as { role_name?: string; name?: string }).role_name ||
        (backendUser.role as { role_name?: string; name?: string }).name
      : backendUser.role_name
  )?.toUpperCase();

  if (rawRole) {
    if (rawRole.includes('ADMIN')) return 'ADMIN';
    if (rawRole.includes('OPERATOR') || rawRole.includes('FARM') || rawRole.includes('STAFF')) {
      return 'FARM_OPERATOR';
    }
    if (rawRole.includes('SHIPPER')) return 'SHIPPER';
    if (rawRole.includes('CUSTOMER')) return 'CUSTOMER';
  }

  switch (backendUser.role_id) {
    case 1:
      return 'ADMIN';
    case 2:
      return 'CUSTOMER';
    case 3:
      return 'SHIPPER';
    case 4:
      return 'FARM_OPERATOR';
    default:
      return backendUser.role_id === 2 ? 'CUSTOMER' : 'ADMIN';
  }
}

/**
 * Maps BackendUser representation to UI AuthUser
 */
export function mapBackendUserToAuthUser(backendUser: BackendUser): AuthUser {
  return {
    id: String(backendUser.user_id),
    user_id: backendUser.user_id,
    role_id: backendUser.role_id,
    email: backendUser.email,
    fullName: backendUser.full_name || '',
    full_name: backendUser.full_name,
    phoneNumber: backendUser.phone || undefined,
    phone: backendUser.phone,
    address: backendUser.address,
    role: resolveUserRole(backendUser),
    status: backendUser.status,
    createdAt: backendUser.created_at,
  };
}

/**
 * Authentication Repository Implementation
 * Connects directly to backend API on Render with secure storage of JWT.
 */
export class AuthRepository implements IAuthRepository {
  private async persistSession(session: AuthSession): Promise<void> {
    if (session.tokens.accessToken) {
      await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, session.tokens.accessToken);
    }
    if (session.tokens.refreshToken) {
      await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, session.tokens.refreshToken);
    }
    if (session.user) {
      await secureStorage.setObject<AuthUser>(STORAGE_KEYS.USER_SESSION, session.user);
    }
  }

  async clearStoredSession(): Promise<void> {
    await secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.USER_SESSION);
  }

  /**
   * Log in with email & password -> returns { message, token, user }
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      const response = await axiosClient.post<AuthResponseDto>(
        API_ENDPOINTS.AUTH.LOGIN,
        {
          email: credentials.email.trim(),
          password: credentials.password,
        }
      );

      const responseData = response.data;
      if (!responseData.token || !responseData.user) {
        throw new AppError('Phản hồi đăng nhập không hợp lệ từ máy chủ.', 'AUTH_ERROR', 500);
      }

      const authUser = mapBackendUserToAuthUser(responseData.user);
      const tokens: AuthTokens = {
        accessToken: responseData.token,
      };

      const session: AuthSession = {
        user: authUser,
        tokens,
      };

      await this.persistSession(session);
      return session;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Register customer with OTP sent to email
   */
  async registerOtp(data: RegisterOtpData): Promise<GenericAuthResponse> {
    try {
      const response = await axiosClient.post<{ message: string }>(
        API_ENDPOINTS.AUTH.REGISTER_OTP,
        {
          name: data.name.trim(),
          email: data.email.trim(),
          password: data.password,
          phone: data.phone?.trim() || undefined,
          address: data.address?.trim() || undefined,
        }
      );
      return {
        success: true,
        message: response.data?.message || 'Mã xác thực OTP đã được gửi đến email của bạn.',
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Verify email registration OTP
   */
  async verifyRegistrationOtp(data: VerifyRegistrationOtpData): Promise<GenericAuthResponse> {
    try {
      const response = await axiosClient.post<{ message: string }>(
        API_ENDPOINTS.AUTH.VERIFY_REGISTRATION_OTP,
        {
          email: data.email.trim(),
          otp: String(data.otp).trim(),
        }
      );
      return {
        success: true,
        message: response.data?.message || 'Xác thực email thành công! Vui lòng đăng nhập.',
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Request password reset OTP
   */
  async forgotPassword(data: ForgotPasswordData): Promise<GenericAuthResponse> {
    try {
      const response = await axiosClient.post<{ message: string }>(
        API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
        {
          email: data.email.trim(),
        }
      );
      return {
        success: true,
        message: response.data?.message || 'Nếu email tồn tại trên hệ thống, mã OTP đặt lại mật khẩu đã được gửi.',
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Reset password with email, OTP, and new password
   */
  async resetPassword(data: ResetPasswordData): Promise<GenericAuthResponse> {
    try {
      const response = await axiosClient.post<{ message: string }>(
        API_ENDPOINTS.AUTH.RESET_PASSWORD_OTP,
        {
          email: data.email.trim(),
          otp: String(data.otp).trim(),
          new_password: data.new_password,
        }
      );
      return {
        success: true,
        message: response.data?.message || 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.',
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Request OTP to change password (requires auth token)
   */
  async requestChangePasswordOtp(): Promise<GenericAuthResponse> {
    try {
      const response = await axiosClient.post<{ message: string }>(
        API_ENDPOINTS.AUTH.REQUEST_CHANGE_PASSWORD_OTP
      );
      return {
        success: true,
        message: response.data?.message || 'Mã OTP đổi mật khẩu đã được gửi đến email của bạn.',
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Change password with OTP (requires auth token)
   */
  async changePasswordOtp(data: ChangePasswordOtpData): Promise<GenericAuthResponse> {
    try {
      const response = await axiosClient.put<{ message: string }>(
        API_ENDPOINTS.AUTH.CHANGE_PASSWORD_OTP,
        {
          otp: String(data.otp).trim(),
          new_password: data.new_password,
        }
      );
      return {
        success: true,
        message: response.data?.message || 'Đổi mật khẩu thành công.',
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch current authenticated user via GET /api/auth/me
   */
  async getCurrentUser(): Promise<AuthUser> {
    try {
      const response = await axiosClient.get<{ user: BackendUser }>(API_ENDPOINTS.AUTH.ME);
      if (!response.data?.user) {
        throw new AppError('Không tìm thấy thông tin người dùng.', 'NOT_FOUND', 404);
      }
      const authUser = mapBackendUserToAuthUser(response.data.user);
      await secureStorage.setObject<AuthUser>(STORAGE_KEYS.USER_SESSION, authUser);
      return authUser;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Log out: clears local secure storage and cached session
   */
  async logout(): Promise<void> {
    await this.clearStoredSession();
  }

  /**
   * Restore stored session and verify token with backend /api/auth/me
   */
  async restoreSession(): Promise<AuthSession | null> {
    try {
      const token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        await this.clearStoredSession();
        return null;
      }

      // Verify token with real backend
      const authUser = await this.getCurrentUser();
      return {
        user: authUser,
        tokens: {
          accessToken: token,
        },
      };
    } catch {
      // Token is expired, invalid, or server returned 401
      await this.clearStoredSession();
      return null;
    }
  }
}

export const authRepository = new AuthRepository();
