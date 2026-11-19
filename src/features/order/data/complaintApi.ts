import { baseApi } from '../../../core/api/baseApi';
import { API_ENDPOINTS } from '../../../core/api/endpoints';

export interface OrderComplaint {
  complaint_id: number;
  order_id: number;
  complaint_type: string;
  description: string;
  status: string;
  created_at: string;
}

interface CreateOrderComplaint {
  orderId: number;
  complaintType: string;
  description: string;
}

export const complaintApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyComplaints: builder.query<
      OrderComplaint[],
      { accountId: string; page?: number; pageSize?: number }
    >({
      query: ({ page = 1, pageSize = 100 }) => ({
        url: API_ENDPOINTS.COMPLAINTS.MY,
        params: { page, pageSize },
      }),
      transformResponse: (response: { data: OrderComplaint[] }) => response.data,
      providesTags: ['Complaint'],
    }),
    createOrderComplaint: builder.mutation<OrderComplaint, CreateOrderComplaint>({
      query: ({ orderId, complaintType, description }) => ({
        url: API_ENDPOINTS.COMPLAINTS.ORDER(orderId),
        method: 'POST',
        data: { complaintType, description },
      }),
      transformResponse: (response: { data: OrderComplaint }) => response.data,
      invalidatesTags: ['Complaint'],
    }),
  }),
});

export const {
  useGetMyComplaintsQuery,
  useCreateOrderComplaintMutation,
} = complaintApi;
