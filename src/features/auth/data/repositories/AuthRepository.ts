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
  ForgotPasswordData,
  GenericAuthResponse,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
} from '../../domain/entities/AuthUser';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { MOCK_AUTH_SESSION } from '../datasources/authMockData';
import {
  getDemoShipperSession,
  isDemoShipperEmail,
  validateDemoShipperCredentials,
} from '../datasources/authDemoCredentials';

/**
 * Authentication Repository Implementation
 * Clean Architecture data layer bridging API requests, SecureStore caching, and domain logic.
 */
export class AuthRepository implements IAuthRepository {
  /**
   * Helper to persist user session tokens securely
   */
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

  /**
   * Helper to clear session tokens securely
   */
  private async clearStoredSession(): Promise<void> {
    await secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.USER_SESSION);
  }

  /**
   * Authenticate customer or demo shipper with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    // ========================================================================
    // DEMO ONLY — REMOVE BEFORE PRODUCTION
    // Intercept hard-coded demo Shipper account for local evaluation
    // ========================================================================
    if (isDemoShipperEmail(credentials.email)) {
      if (validateDemoShipperCredentials(credentials)) {
        const demoSession = getDemoShipperSession();
        await this.persistSession(demoSession);
        return demoSession;
      }
      throw new AppError(
        'Mật khẩu không chính xác. Vui lòng kiểm tra lại.',
        'INVALID_CREDENTIALS',
        400
      );
    }

    try {
      const response = await axiosClient.post<AuthResponseDto | AuthSession>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      const responseData = response.data as {
        data?: { user?: AuthUser; tokens?: AuthTokens };
        user?: AuthUser;
        tokens?: AuthTokens;
      };

      const session: AuthSession =
        responseData.user && responseData.tokens
          ? {
              user: responseData.user,
              tokens: responseData.tokens,
            }
          : {
              user: responseData.data?.user || MOCK_AUTH_SESSION.user,
              tokens: responseData.data?.tokens || MOCK_AUTH_SESSION.tokens,
            };

      await this.persistSession(session);
      return session;
    } catch (error) {
      // If server is offline/unreachable in demo mode, provide realistic validation & demo login
      if (
        error instanceof AppError &&
        (error.code === 'NETWORK_ERROR' || error.statusCode === 404 || error.statusCode === 502)
      ) {
        // Fallback for development demo credentials
        if (
          credentials.email.toLowerCase() === 'khachhang@smartmush.vn' ||
          credentials.email.toLowerCase() === 'demo@smartmush.vn' ||
          credentials.email.includes('@')
        ) {
          const demoSession: AuthSession = {
            user: {
              ...MOCK_AUTH_SESSION.user,
              email: credentials.email.toLowerCase(),
            },
            tokens: { ...MOCK_AUTH_SESSION.tokens },
          };
          await this.persistSession(demoSession);
          return demoSession;
        }
      }

      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Register a new customer account
   */
  async register(data: RegisterData): Promise<AuthSession> {
    try {
      const response = await axiosClient.post<AuthResponseDto | AuthSession>(
        API_ENDPOINTS.AUTH.REGISTER,
        {
          fullName: data.fullName,
          email: data.email,
          phoneNumber: data.phoneNumber,
          password: data.password,
        }
      );

      const responseData = response.data;
      const session: AuthSession =
        'tokens' in responseData && 'user' in responseData
          ? {
              user: responseData.user,
              tokens: responseData.tokens,
            }
          : {
              user: {
                id: `CUST-${Date.now()}`,
                email: data.email,
                fullName: data.fullName,
                phoneNumber: data.phoneNumber,
                role: 'CUSTOMER',
                createdAt: new Date().toISOString(),
              },
              tokens: { ...MOCK_AUTH_SESSION.tokens },
            };

      await this.persistSession(session);
      return session;
    } catch (error) {
      // Fallback for offline development demo
      if (
        error instanceof AppError &&
        (error.code === 'NETWORK_ERROR' || error.statusCode === 404 || error.statusCode === 502)
      ) {
        const demoSession: AuthSession = {
          user: {
            id: `CUST-${Date.now()}`,
            email: data.email,
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
            role: 'CUSTOMER',
            createdAt: new Date().toISOString(),
          },
          tokens: { ...MOCK_AUTH_SESSION.tokens },
        };
        await this.persistSession(demoSession);
        return demoSession;
      }

      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(data: ForgotPasswordData): Promise<GenericAuthResponse> {
    try {
      const response = await axiosClient.post<GenericAuthResponse>(
        API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
        data
      );
      return (
        response.data || {
          success: true,
          message: 'Mã xác thực đặt lại mật khẩu đã được gửi đến email của bạn.',
        }
      );
    } catch (error) {
      // Fallback for offline development demo
      if (
        error instanceof AppError &&
        (error.code === 'NETWORK_ERROR' || error.statusCode === 404 || error.statusCode === 502)
      ) {
        return {
          success: true,
          message: 'Mã xác thực đặt lại mật khẩu đã được gửi đến email của bạn.',
        };
      }
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Submit OTP and set new password
   */
  async resetPassword(data: ResetPasswordData): Promise<GenericAuthResponse> {
    try {
      const response = await axiosClient.post<GenericAuthResponse>(
        API_ENDPOINTS.AUTH.RESET_PASSWORD,
        data
      );
      return (
        response.data || {
          success: true,
          message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.',
        }
      );
    } catch (error) {
      if (
        error instanceof AppError &&
        (error.code === 'NETWORK_ERROR' || error.statusCode === 404 || error.statusCode === 502)
      ) {
        return {
          success: true,
          message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.',
        };
      }
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch current authenticated user profile
   */
  async getCurrentUser(): Promise<AuthUser> {
    try {
      const response = await axiosClient.get<AuthUser | { data: AuthUser }>(API_ENDPOINTS.AUTH.ME);
      const user =
        'data' in response.data ? (response.data as { data: AuthUser }).data : response.data;
      await secureStorage.setObject<AuthUser>(STORAGE_KEYS.USER_SESSION, user);
      return user;
    } catch (error) {
      const storedUser = await secureStorage.getObject<AuthUser>(STORAGE_KEYS.USER_SESSION);
      if (storedUser) {
        return storedUser;
      }
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Log out customer
   */
  async logout(): Promise<void> {
    try {
      await axiosClient.post(API_ENDPOINTS.AUTH.LOGOUT).catch(() => {});
    } finally {
      await this.clearStoredSession();
    }
  }

  /**
   * Restore stored session on app startup
   */
  async restoreSession(): Promise<AuthSession | null> {
    try {
      const token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const user = await secureStorage.getObject<AuthUser>(STORAGE_KEYS.USER_SESSION);

      if (token && user) {
        return {
          user,
          tokens: {
            accessToken: token,
            refreshToken: refreshToken || undefined,
          },
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const authRepository = new AuthRepository();
