import { baseApi } from '../../../core/api/baseApi';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import type { CustomerSessionFilter, CustomerSessionsPage } from '../domain/entities/Order';

export const customerSessionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerSessions: builder.query<CustomerSessionsPage, { accountId: string; page: number; status: CustomerSessionFilter }>({
      query: ({ page, status }) => ({
        url: API_ENDPOINTS.CUSTOMER.SESSIONS,
        params: { page, pageSize: 20, status },
      }),
      providesTags: ['Order', 'Tray'],
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useGetCustomerSessionsQuery } = customerSessionApi;
