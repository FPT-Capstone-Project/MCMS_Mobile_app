import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../app/store/hooks';
import {
  ChangePasswordOtpData,
  ForgotPasswordData,
  LoginCredentials,
  RegisterOtpData,
  ResetPasswordData,
  VerifyRegistrationOtpData,
} from '../../domain/entities/AuthUser';
import {
  changePasswordOtpUser,
  clearAuthError,
  clearRegistrationSuccessMessage,
  forgotPasswordUser,
  handleForceLogout,
  initializeAuth,
  loginUser,
  logoutUser,
  registerOtpUser,
  requestChangePasswordOtpUser,
  resetPasswordUser,
  verifyRegistrationOtpUser,
} from '../slices/authSlice';

/**
 * Custom hook for accessing authentication state and dispatching auth actions
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, tokens, status, loading, error, registrationSuccessMessage } = useAppSelector(
    (state) => state.auth
  );

  const handleInitialize = useCallback(() => {
    return dispatch(initializeAuth()).unwrap();
  }, [dispatch]);

  const handleLogin = useCallback(
    (credentials: LoginCredentials) => {
      return dispatch(loginUser(credentials)).unwrap();
    },
    [dispatch]
  );

  const handleRegisterOtp = useCallback(
    (data: RegisterOtpData) => {
      return dispatch(registerOtpUser(data)).unwrap();
    },
    [dispatch]
  );

  const handleVerifyRegistrationOtp = useCallback(
    (data: VerifyRegistrationOtpData) => {
      return dispatch(verifyRegistrationOtpUser(data)).unwrap();
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

  const handleRequestChangePasswordOtp = useCallback(() => {
    return dispatch(requestChangePasswordOtpUser()).unwrap();
  }, [dispatch]);

  const handleChangePasswordOtp = useCallback(
    (data: ChangePasswordOtpData) => {
      return dispatch(changePasswordOtpUser(data)).unwrap();
    },
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    return dispatch(logoutUser()).unwrap();
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const handleClearRegistrationSuccess = useCallback(() => {
    dispatch(clearRegistrationSuccessMessage());
  }, [dispatch]);

  const forceLogout = useCallback(() => {
    dispatch(handleForceLogout());
  }, [dispatch]);

  return {
    user,
    tokens,
    status,
    loading,
    error,
    registrationSuccessMessage,
    isAuthenticated: status === 'authenticated',
    isInitializing: status === 'initializing',
    role: user?.role,
    isShipper: user?.role === 'SHIPPER',
    isAdmin: user?.role === 'ADMIN',
    isFarmOperator: user?.role === 'FARM_OPERATOR',
    canControlIot: user?.role === 'ADMIN' || user?.role === 'FARM_OPERATOR',
    isCustomer: user?.role === 'CUSTOMER' || !user?.role,
    initialize: handleInitialize,
    login: handleLogin,
    registerOtp: handleRegisterOtp,
    verifyRegistrationOtp: handleVerifyRegistrationOtp,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    requestChangePasswordOtp: handleRequestChangePasswordOtp,
    changePasswordOtp: handleChangePasswordOtp,
    logout: handleLogout,
    clearError: handleClearError,
    clearRegistrationSuccess: handleClearRegistrationSuccess,
    forceLogout,
  };
}
