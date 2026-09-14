import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../app/store/hooks';
import {
  ForgotPasswordData,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
} from '../../domain/entities/AuthUser';
import {
  clearAuthError,
  forgotPasswordUser,
  initializeAuth,
  loginUser,
  logoutUser,
  registerUser,
  resetPasswordUser,
} from '../slices/authSlice';

/**
 * Custom hook for accessing authentication state and dispatching auth actions
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, tokens, status, loading, error } = useAppSelector((state) => state.auth);

  const handleInitialize = useCallback(() => {
    return dispatch(initializeAuth()).unwrap();
  }, [dispatch]);

  const handleLogin = useCallback(
    (credentials: LoginCredentials) => {
      return dispatch(loginUser(credentials)).unwrap();
    },
    [dispatch]
  );

  const handleRegister = useCallback(
    (data: RegisterData) => {
      return dispatch(registerUser(data)).unwrap();
    },
    [dispatch]
  );

  const handleForgotPassword = useCallback(
    (data: ForgotPasswordData) => {
      return dispatch(forgotPasswordUser(data)).unwrap();
    },
    [dispatch]
  );

  const handleResetPassword = useCallback(
    (data: ResetPasswordData) => {
      return dispatch(resetPasswordUser(data)).unwrap();
    },
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    return dispatch(logoutUser()).unwrap();
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  return {
    user,
    tokens,
    status,
    loading,
    error,
    isAuthenticated: status === 'authenticated',
    isInitializing: status === 'initializing',
    role: user?.role,
    isShipper: user?.role === 'SHIPPER',
    isCustomer: user?.role === 'CUSTOMER' || !user?.role,
    initialize: handleInitialize,
    login: handleLogin,
    register: handleRegister,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    logout: handleLogout,
    clearError: handleClearError,
  };
}
