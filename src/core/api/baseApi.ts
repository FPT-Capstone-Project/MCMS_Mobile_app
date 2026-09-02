import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

/**
 * Root RTK Query Base API
 * Features will inject their endpoints into this base API using baseApi.injectEndpoints().
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'Auth',
    'User',
    'Tray',
    'Rental',
    'Order',
    'Monitoring',
    'Notification',
  ],
  endpoints: () => ({}),
});
