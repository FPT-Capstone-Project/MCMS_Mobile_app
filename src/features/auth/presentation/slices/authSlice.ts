import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { baseApi } from '../../../../core/api/baseApi';
import { AppError } from '../../../../core/errors/appError';
import {
  AuthSession,
  AuthTokens,
  AuthUser,
  ForgotPasswordData,
  GenericAuthResponse,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
} from '../../domain/entities/AuthUser';
import { authRepository } from '../../data/repositories/AuthRepository';

export type AuthStatus = 'idle' | 'initializing' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  status: 'initializing',
  user: null,
  tokens: null,
  loading: false,
  error: null,
};

/**
 * Async Thunk: Restore session from SecureStore on startup
 */
export const initializeAuth = createAsyncThunk<AuthSession | null, void, { rejectValue: string }>(
  'auth/initializeAuth',
  async (_, { rejectWithValue }) => {
    try {
      const session = await authRepository.restoreSession();
      return session;
    } catch (error) {
      const msg = error instanceof AppError ? error.message : 'Không thể khôi phục phiên đăng nhập.';
      return rejectWithValue(msg);
    }
  }
);

/**
 * Async Thunk: Log in with credentials
 */
export const loginUser = createAsyncThunk<AuthSession, LoginCredentials, { rejectValue: string }>(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const session = await authRepository.login(credentials);
      return session;
    } catch (error) {
      const msg = error instanceof AppError ? error.message : 'Đăng nhập không thành công. Vui lòng thử lại.';
      return rejectWithValue(msg);
    }
  }
);

/**
 * Async Thunk: Register new account
 */
export const registerUser = createAsyncThunk<AuthSession, RegisterData, { rejectValue: string }>(
  'auth/registerUser',
  async (data, { rejectWithValue }) => {
    try {
      const session = await authRepository.register(data);
      return session;
    } catch (error) {
      const msg = error instanceof AppError ? error.message : 'Đăng ký không thành công. Vui lòng thử lại.';
      return rejectWithValue(msg);
    }
  }
);

/**
 * Async Thunk: Request password reset
 */
export const forgotPasswordUser = createAsyncThunk<
  GenericAuthResponse,
  ForgotPasswordData,
  { rejectValue: string }
>('auth/forgotPasswordUser', async (data, { rejectWithValue }) => {
  try {
    return await authRepository.forgotPassword(data);
  } catch (error) {
    const msg =
      error instanceof AppError ? error.message : 'Không thể gửi yêu cầu đặt lại mật khẩu.';
    return rejectWithValue(msg);
  }
});

/**
 * Async Thunk: Reset password with OTP
 */
export const resetPasswordUser = createAsyncThunk<
  GenericAuthResponse,
  ResetPasswordData,
  { rejectValue: string }
>('auth/resetPasswordUser', async (data, { rejectWithValue }) => {
  try {
    return await authRepository.resetPassword(data);
  } catch (error) {
    const msg = error instanceof AppError ? error.message : 'Không thể đặt lại mật khẩu.';
    return rejectWithValue(msg);
  }
});

/**
 * Async Thunk: Log out user and purge cache
 */
export const logoutUser = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logoutUser',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await authRepository.logout();
      // Reset all RTK Query cached server state
      dispatch(baseApi.util.resetApiState());
    } catch (error) {
      const msg = error instanceof AppError ? error.message : 'Đăng xuất không thành công.';
      return rejectWithValue(msg);
    }
  }
);

/**
 * Redux Slice for Customer Authentication
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.user = action.payload;
    },
    setSession: (state, action: PayloadAction<AuthSession>) => {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.status = 'authenticated';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // initializeAuth
    builder.addCase(initializeAuth.pending, (state) => {
      state.status = 'initializing';
      state.loading = true;
    });
    builder.addCase(initializeAuth.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload) {
        state.status = 'authenticated';
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
      } else {
        state.status = 'unauthenticated';
        state.user = null;
        state.tokens = null;
      }
    });
    builder.addCase(initializeAuth.rejected, (state) => {
      state.loading = false;
      state.status = 'unauthenticated';
      state.user = null;
      state.tokens = null;
    });

    // loginUser
    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.loading = false;
      state.status = 'authenticated';
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.error = null;
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Đăng nhập không thành công.';
    });

    // registerUser
    builder.addCase(registerUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      state.loading = false;
      state.status = 'authenticated';
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.error = null;
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Đăng ký không thành công.';
    });

    // logoutUser
    builder.addCase(logoutUser.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.loading = false;
      state.status = 'unauthenticated';
      state.user = null;
      state.tokens = null;
      state.error = null;
    });
    builder.addCase(logoutUser.rejected, (state) => {
      state.loading = false;
      state.status = 'unauthenticated';
      state.user = null;
      state.tokens = null;
    });
  },
});

export const { clearAuthError, setUser, setSession } = authSlice.actions;
export const authReducer = authSlice.reducer;
