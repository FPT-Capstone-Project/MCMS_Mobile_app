import { baseApi } from '../../../core/api/baseApi';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import type { CustomerNotification } from '../domain/entities/Notification';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Account ID scopes the cache; authentication determines the API recipient.
    getUnreadNotificationCount: builder.query<number, string>({
      query: () => ({ url: API_ENDPOINTS.NOTIFICATIONS.BASE, params: { page: 1, pageSize: 1 } }),
      transformResponse: (response: { meta: { unread_count: number } }) =>
        Math.max(0, Number(response.meta.unread_count) || 0),
      providesTags: ['Notification'],
      keepUnusedDataFor: 0,
    }),
    readNotification: builder.mutation<CustomerNotification, number>({
      query: (id) => ({ url: API_ENDPOINTS.NOTIFICATIONS.READ(id), method: 'PATCH' }),
      transformResponse: (response: { data: CustomerNotification }) => response.data,
      invalidatesTags: ['Notification'],
    }),
    readAllNotifications: builder.mutation<unknown, void>({
      query: () => ({ url: API_ENDPOINTS.NOTIFICATIONS.READ_ALL, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const { useGetUnreadNotificationCountQuery, useReadNotificationMutation, useReadAllNotificationsMutation } = notificationApi;
