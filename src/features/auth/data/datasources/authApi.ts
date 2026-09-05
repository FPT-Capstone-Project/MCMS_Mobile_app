import { baseApi } from '../../../../core/api/baseApi';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import {
  AuthSession,
  AuthUser,
  ForgotPasswordData,
  GenericAuthResponse,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
} from '../../domain/entities/AuthUser';

/**
 * RTK Query Auth API Service
 * Injected into baseApi for server-state caching and synchronization.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthSession, LoginCredentials>({
      query: (credentials) => ({
        url: API_ENDPOINTS.AUTH.LOGIN,
        method: 'POST',
        data: credentials,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),

    register: builder.mutation<AuthSession, RegisterData>({
      query: (data) => ({
        url: API_ENDPOINTS.AUTH.REGISTER,
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),

    forgotPassword: builder.mutation<GenericAuthResponse, ForgotPasswordData>({
      query: (data) => ({
        url: API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
        method: 'POST',
        data,
      }),
    }),

    resetPassword: builder.mutation<GenericAuthResponse, ResetPasswordData>({
      query: (data) => ({
        url: API_ENDPOINTS.AUTH.RESET_PASSWORD,
        method: 'POST',
        data,
      }),
    }),

    getMe: builder.query<AuthUser, void>({
      query: () => ({
        url: API_ENDPOINTS.AUTH.ME,
        method: 'GET',
      }),
      providesTags: ['User'],
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: API_ENDPOINTS.AUTH.LOGOUT,
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'User', 'Tray', 'Rental', 'Order', 'Monitoring', 'Notification'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useLogoutMutation,
} = authApi;
