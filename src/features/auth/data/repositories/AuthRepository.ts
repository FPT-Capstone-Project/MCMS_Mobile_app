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
  UpdateUserProfileData,
  VerifyRegistrationOtpData,
  UserRole,
} from '../../domain/entities/AuthUser';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository';

/**
 * Cross-platform JWT payload decoder for React Native
 */
export function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = '';
    for (let i = 0; i < base64.length; ) {
      const enc1 = chars.indexOf(base64.charAt(i++));
      const enc2 = chars.indexOf(base64.charAt(i++));
      const enc3 = chars.indexOf(base64.charAt(i++));
      const enc4 = chars.indexOf(base64.charAt(i++));

      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;

      str += String.fromCharCode(chr1);
      if (enc3 !== 64 && enc3 !== -1) str += String.fromCharCode(chr2);
      if (enc4 !== 64 && enc4 !== -1) str += String.fromCharCode(chr3);
    }
    const decoded = decodeURIComponent(
      str
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Resolves precise UserRole from BackendUser data
 */
export function resolveUserRole(backendUser: any): UserRole {
  if (!backendUser) return 'CUSTOMER';

  const rawRole = String(
    typeof backendUser.role === 'string'
      ? backendUser.role
      : typeof backendUser.role === 'object' && backendUser.role !== null
      ? (backendUser.role as { role_name?: string; name?: string; roleName?: string }).role_name ||
        (backendUser.role as { role_name?: string; name?: string; roleName?: string }).roleName ||
        (backendUser.role as { role_name?: string; name?: string; roleName?: string }).name
      : backendUser.role_name || backendUser.roleName || ''
  ).toUpperCase();

  if (rawRole) {
    if (rawRole.includes('ADMIN')) return 'ADMIN';
    if (rawRole.includes('OPERATOR') || rawRole.includes('FARM') || rawRole.includes('STAFF')) {
      return 'FARM_OPERATOR';
    }
    if (rawRole.includes('EXPERT')) return 'EXPERT';
    if (rawRole.includes('CUSTOMER') || rawRole.includes('USER')) return 'CUSTOMER';
  }

  const roleId = Number(backendUser.role_id ?? backendUser.roleId);
  switch (roleId) {
    case 1:
      return 'ADMIN';
    case 2:
      return 'FARM_OPERATOR';
    case 3:
      return 'CUSTOMER';
    case 4:
      return 'EXPERT';
    default:
      return 'CUSTOMER';
  }
}

/**
 * Maps BackendUser representation to UI AuthUser
 */
export function mapBackendUserToAuthUser(backendUser: any): AuthUser {
  if (!backendUser) {
    return {
      id: '0',
      email: '',
      fullName: '',
      role: 'CUSTOMER',
    };
  }

  const userId = backendUser.user_id ?? backendUser.id ?? backendUser.userId ?? 0;
  const roleId = backendUser.role_id ?? backendUser.roleId ?? undefined;
  const email = backendUser.email || '';
  const fullName =
    backendUser.full_name ||
    backendUser.fullName ||
    backendUser.name ||
    (email ? email.split('@')[0] : '');
  const phone = backendUser.phone || backendUser.phoneNumber || null;
  const address = backendUser.address || null;
  const status = backendUser.status || 'ACTIVE';
  const createdAt = backendUser.created_at || backendUser.createdAt;

  return {
    id: String(userId),
    user_id: typeof userId === 'number' ? userId : Number(userId) || undefined,
    role_id: typeof roleId === 'number' ? roleId : roleId != null ? Number(roleId) : undefined,
    email,
    fullName,
    full_name: fullName,
    phoneNumber: phone || undefined,
    phone,
    address,
    role: resolveUserRole(backendUser),
    status,
    createdAt,
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
   * Log in with email & password -> flexible extraction of token and user
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

      const raw: any = response.data;
      if (!raw) {
        throw new AppError('Máy chủ không trả về dữ liệu đăng nhập.', 'AUTH_ERROR', 500);
      }

      // 1. Extract Access Token from all common backend structures
      const accessToken: string | undefined =
        raw.token ||
        raw.accessToken ||
        raw.access_token ||
        raw.jwt ||
        raw.data?.token ||
        raw.data?.accessToken ||
        raw.data?.access_token ||
        raw.data?.jwt ||
        raw.result?.token ||
        raw.result?.accessToken ||
        raw.result?.access_token;

      // Extract Refresh Token if available
      const refreshToken: string | undefined =
        raw.refreshToken ||
        raw.refresh_token ||
        raw.data?.refreshToken ||
        raw.data?.refresh_token ||
        raw.result?.refreshToken ||
        raw.result?.refresh_token;

      if (!accessToken || typeof accessToken !== 'string') {
        throw new AppError(
          'Phản hồi đăng nhập không chứa mã xác thực (token) từ máy chủ.',
          'AUTH_ERROR',
          500
        );
      }

      // 2. Extract User data from all common response structures
      let rawUser: any =
        raw.user ||
        raw.data?.user ||
        raw.result?.user ||
        raw.userInfo ||
        raw.data?.userInfo ||
        raw.profile ||
        raw.data?.profile;

      // If user is embedded directly in data (flat data object having user fields)
      if (
        !rawUser &&
        raw.data &&
        typeof raw.data === 'object' &&
        (raw.data.user_id != null || raw.data.id != null || raw.data.email != null)
      ) {
        rawUser = raw.data;
      }

      // If user is flat at root level alongside token
      if (!rawUser && (raw.user_id != null || raw.id != null || raw.email != null)) {
        rawUser = raw;
      }

      // If user is still not provided in response body, decode from JWT token payload!
      if (!rawUser) {
        const decoded = parseJwtPayload(accessToken);
        if (
          decoded &&
          (decoded.user_id != null ||
            decoded.id != null ||
            decoded.sub != null ||
            decoded.email != null)
        ) {
          rawUser = {
            user_id:
              decoded.user_id ??
              decoded.id ??
              (typeof decoded.sub === 'number' ? decoded.sub : Number(decoded.sub) || 0),
            role_id: decoded.role_id ?? decoded.roleId,
            role: decoded.role || decoded.role_name || decoded.roleName,
            email: decoded.email || credentials.email.trim(),
            full_name:
              decoded.full_name || decoded.fullName || decoded.name || credentials.email.trim(),
            phone: decoded.phone || decoded.phoneNumber || null,
            address: decoded.address || null,
            status: decoded.status || 'ACTIVE',
          };
        }
      }

      // If still no user found, synthesize basic user from credentials so user is not blocked
      if (!rawUser) {
        rawUser = {
          user_id: 0,
          role_id: 3,
          email: credentials.email.trim(),
          full_name: credentials.email.trim().split('@')[0],
          status: 'ACTIVE',
        };
      }

      const authUser = mapBackendUserToAuthUser(rawUser);
      const tokens: AuthTokens = {
        accessToken,
        refreshToken,
      };

      const session: AuthSession = {
        user: authUser,
        tokens,
      };

      await this.persistSession(session);

      // If user was synthesized without ID, attempt to enrich via GET /api/auth/me in background
      if (!authUser.user_id || authUser.user_id === 0) {
        try {
          const freshUser = await this.getCurrentUser();
          session.user = freshUser;
        } catch {
          // Keep existing session
        }
      }

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
      const response = await axiosClient.get<any>(API_ENDPOINTS.AUTH.ME);
      const raw = response.data;
      const rawUser =
        raw?.user ||
        raw?.data?.user ||
        raw?.data ||
        raw?.result?.user ||
        raw?.result ||
        raw;

      if (!rawUser || (rawUser.user_id == null && rawUser.id == null && !rawUser.email)) {
        throw new AppError('Không tìm thấy thông tin người dùng.', 'NOT_FOUND', 404);
      }
      const authUser = mapBackendUserToAuthUser(rawUser);
      await secureStorage.setObject<AuthUser>(STORAGE_KEYS.USER_SESSION, authUser);
      return authUser;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Update the current user's editable profile fields.
   */
  async updateProfile(data: UpdateUserProfileData): Promise<AuthUser> {
    try {
      const response = await axiosClient.patch<{ data: BackendUser }>(
        API_ENDPOINTS.USERS.ME,
        data
      );
      if (!response.data?.data) {
        throw new AppError('Phản hồi cập nhật hồ sơ không hợp lệ từ máy chủ.', 'API_ERROR', 500);
      }

      const authUser = mapBackendUserToAuthUser(response.data.data);
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

      try {
        const authUser = await this.getCurrentUser();
        return {
          user: authUser,
          tokens: {
            accessToken: token,
          },
        };
      } catch (err: any) {
        // If token explicitly unauthorized (401/403), purge stored session
        if (err?.statusCode === 401 || err?.statusCode === 403 || err?.code === 'AUTH_ERROR') {
          await this.clearStoredSession();
          return null;
        }

        // If offline or temporary server error, fallback to cached user session
        const cachedUser = await secureStorage.getObject<AuthUser>(STORAGE_KEYS.USER_SESSION);
        if (cachedUser) {
          const normalizedUser: AuthUser = {
            ...cachedUser,
            role: resolveUserRole({
              role: cachedUser.role,
              role_id: cachedUser.role_id,
            }),
          };
          if (normalizedUser.role !== cachedUser.role) {
            await secureStorage.setObject<AuthUser>(STORAGE_KEYS.USER_SESSION, normalizedUser);
          }
          return {
            user: normalizedUser,
            tokens: {
              accessToken: token,
            },
          };
        }

        // Fallback: decode from JWT token if available
        const decoded = parseJwtPayload(token);
        if (decoded && (decoded.user_id != null || decoded.id != null || decoded.email != null)) {
          const fallbackUser = mapBackendUserToAuthUser({
            user_id:
              decoded.user_id ??
              decoded.id ??
              (typeof decoded.sub === 'number' ? decoded.sub : Number(decoded.sub) || 0),
            role_id: decoded.role_id ?? decoded.roleId,
            role: decoded.role || decoded.role_name || decoded.roleName,
            email: decoded.email || '',
            full_name: decoded.full_name || decoded.fullName || decoded.name || '',
          });
          return {
            user: fallbackUser,
            tokens: {
              accessToken: token,
            },
          };
        }

        await this.clearStoredSession();
        return null;
      }
    } catch {
      await this.clearStoredSession();
      return null;
    }
  }
}

export const authRepository = new AuthRepository();
