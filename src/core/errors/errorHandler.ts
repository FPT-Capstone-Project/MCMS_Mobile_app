import { AxiosError, isAxiosError } from 'axios';
import {
  AppError,
  AuthError,
  NetworkError,
  NotFoundError,
  ServerError,
  ValidationError,
} from './appError';

export interface ApiErrorPayload {
  message?: string;
  code?: string;
  errors?: Record<string, string[] | string>;
}

export function handleApiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorPayload>;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;
    const message =
      responseData?.message || axiosError.message || 'An unexpected error occurred';

    if (!axiosError.response) {
      // Network timeout / offline
      return new NetworkError(axiosError.message || 'Unable to connect to server');
    }

    switch (status) {
      case 400:
      case 422:
        return new ValidationError(message, responseData?.errors);
      case 401:
      case 403:
        return new AuthError(message, status);
      case 404:
        return new NotFoundError(message);
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(message, status);
      default:
        return new AppError(message, responseData?.code || 'API_ERROR', status, responseData?.errors);
    }
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR');
  }

  return new AppError('An unknown error occurred', 'UNKNOWN_ERROR');
}
