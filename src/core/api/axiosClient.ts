/* eslint-disable import/no-named-as-default-member */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { handleApiError } from '../errors/errorHandler';
import { secureStorage } from '../storage/secureStorage';

/**
 * Centralized Axios Instance
 * Handles authentication header injection, timeout configuration, and global error handling.
 */
export const axiosClient = axios.create({
  baseURL: ENV.apiUrl,
  timeout: ENV.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Injects Authorization token from SecureStore if available
axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Proceed without token if retrieval fails
    }
    return config;
  },
  (error) => Promise.reject(handleApiError(error))
);

// Response Interceptor: Standardizes error objects
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const formattedError = handleApiError(error);
    return Promise.reject(formattedError);
  }
);
