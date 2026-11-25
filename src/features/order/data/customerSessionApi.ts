import { baseApi } from '../../../core/api/baseApi';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import type {
  CustomerSession,
  CustomerSessionFilter,
  CustomerSessionTray,
  CustomerSessionsPage,
} from '../domain/entities/Order';

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

function isCustomerSessionTray(value: unknown): value is CustomerSessionTray {
  if (!value || typeof value !== 'object') return false;
  const tray = value as Record<string, unknown>;
  return typeof tray.session_tray_id === 'number' &&
    typeof tray.tray_id === 'number' &&
    typeof tray.tray_code === 'string' &&
    typeof tray.assignment_status === 'string' &&
    isNullableString(tray.tray_status) &&
    isNullableString(tray.room_name) &&
    isNullableNumber(tray.floor_id) &&
    isNullableString(tray.floor_name) &&
    isNullableNumber(tray.floor_number) &&
    isNullableNumber(tray.row_number) &&
    isNullableNumber(tray.column_number);
}

function isCustomerSession(value: unknown): value is CustomerSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Record<string, unknown>;
  return typeof session.session_id === 'number' &&
    typeof session.order_id === 'number' &&
    typeof session.status === 'string' &&
    isNullableString(session.harvest_status) &&
    isNullableString(session.start_at) &&
    isNullableString(session.end_at) &&
    typeof session.mushroom_name === 'string' &&
    typeof session.tray_quantity === 'number' &&
    Array.isArray(session.trays) &&
    session.trays.every(isCustomerSessionTray);
}

function isCustomerSessionsPage(value: unknown): value is CustomerSessionsPage {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.data) || !response.data.every(isCustomerSession)) return false;
  if (!response.pagination || typeof response.pagination !== 'object') return false;
  const pagination = response.pagination as Record<string, unknown>;
  return ['page', 'pageSize', 'total', 'totalPages'].every((key) =>
    Number.isSafeInteger(pagination[key]) && Number(pagination[key]) >= 0
  );
}

const invalidSessionsResponse = {
  status: 500,
  code: 'INVALID_RESPONSE',
  message: 'Danh sách phiên từ máy chủ không hợp lệ hoặc chưa được tải đầy đủ.',
};

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
    getAllCustomerSessions: builder.query<CustomerSession[], {
      accountId: string;
      status: CustomerSessionFilter;
    }>({
      async queryFn({ status }, _api, _extraOptions, baseQuery) {
        const sessions: CustomerSession[] = [];
        let expectedTotal = 0;
        let totalPages = 1;

        for (let page = 1; page <= totalPages; page += 1) {
          const result = await baseQuery({
            url: API_ENDPOINTS.CUSTOMER.SESSIONS,
            params: { page, pageSize: 100, status },
          });
          if (result.error) return { error: result.error };
          if (!isCustomerSessionsPage(result.data) || result.data.pagination.page !== page) {
            return { error: invalidSessionsResponse };
          }

          if (page === 1) {
            expectedTotal = result.data.pagination.total;
            totalPages = result.data.pagination.totalPages;
          } else if (
            result.data.pagination.total !== expectedTotal ||
            result.data.pagination.totalPages !== totalPages
          ) {
            return { error: invalidSessionsResponse };
          }
          sessions.push(...result.data.data);
        }

        if (sessions.length !== expectedTotal) {
          return { error: invalidSessionsResponse };
        }
        return { data: sessions };
      },
      providesTags: ['Order', 'Tray'],
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useGetCustomerSessionsQuery,
  useGetAllCustomerSessionsQuery,
} = customerSessionApi;
