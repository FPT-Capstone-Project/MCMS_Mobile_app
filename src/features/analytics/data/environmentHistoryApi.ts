import { baseApi } from '../../../core/api/baseApi';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import type { EnvironmentHistoryData, LatestEnvironmentData } from '../domain/entities/EnvironmentHistory';
import type { CustomerEnvironmentHistoryPoint } from '../../tray/domain/entities/Tray';
import { trayRepository } from '../../tray/data/repositories/TrayRepository';
import { appendLiveEnvironment } from '../domain/liveEnvironment';

export const environmentHistoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLatestEnvironment: builder.query<LatestEnvironmentData, { accountId: string }>({
      query: () => ({ url: '/api/analytics/dashboard/environment-latest' }),
      transformResponse: (response: { data: LatestEnvironmentData }) => appendLiveEnvironment(undefined, response.data),
      merge: (previous, next) => appendLiveEnvironment(previous, next),
      keepUnusedDataFor: 900,
    }),
    getDashboardEnvironment: builder.query<EnvironmentHistoryData, { accountId: string }>({
      query: () => ({
        url: API_ENDPOINTS.ANALYTICS.ENVIRONMENT_HISTORY,
        params: { bucketMinutes: 30 },
      }),
      transformResponse: (response: { data: EnvironmentHistoryData }) => response.data,
      keepUnusedDataFor: 300,
    }),
    getTrayEnvironment: builder.query<CustomerEnvironmentHistoryPoint[], {
      accountId: string; sessionId: number; rangeHours: number;
    }>({
      async queryFn({ sessionId, rangeHours }) {
        try {
          const to = new Date();
          const from = new Date(to.getTime() - rangeHours * 3_600_000);
          const data = await trayRepository.getCustomerEnvironmentHistory(
            sessionId, 0, from.toISOString(), to.toISOString(),
          );
          return { data };
        } catch (error) {
          return { error: {
            code: 'ENVIRONMENT_HISTORY_ERROR',
            message: error instanceof Error ? error.message : 'Không thể tải lịch sử môi trường.',
          } };
        }
      },
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetDashboardEnvironmentQuery, useGetTrayEnvironmentQuery, useGetLatestEnvironmentQuery } = environmentHistoryApi;
