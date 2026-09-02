import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig } from 'axios';
import { AppError } from '../errors/appError';
import { handleApiError } from '../errors/errorHandler';
import { axiosClient } from './axiosClient';

export interface AxiosBaseQueryArgs {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: AxiosRequestConfig['data'];
  params?: AxiosRequestConfig['params'];
  headers?: AxiosRequestConfig['headers'];
}

export interface CustomQueryError {
  status?: number;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Custom RTK Query BaseQuery using centralized Axios Client
 * Ensures all API calls benefit from interceptors, unified error handling, and timeout configurations.
 */
export const axiosBaseQuery =
  (
    { baseUrl }: { baseUrl: string } = { baseUrl: '' }
  ): BaseQueryFn<AxiosBaseQueryArgs, unknown, CustomQueryError> =>
  async ({ url, method = 'GET', data, params, headers }) => {
    try {
      const result = await axiosClient({
        url: baseUrl ? `${baseUrl}${url}` : url,
        method,
        data,
        params,
        headers,
      });

      return { data: result.data };
    } catch (axiosError) {
      const appErr =
        axiosError instanceof AppError ? axiosError : handleApiError(axiosError);

      return {
        error: {
          status: appErr.statusCode,
          message: appErr.message,
          code: appErr.code,
          details: appErr.details as Record<string, unknown> | undefined,
        },
      };
    }
  };
