import { baseApi } from '../../../core/api/baseApi';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';

export interface OrderComplaint {
  complaint_id: number;
  order_id: number;
  complaint_type: string;
  description: string;
  status: string;
  created_at: string;
}

export interface ComplaintReply {
  reply_id: number;
  sender_name: string;
  sender_role_id: number;
  message: string;
  created_at: string;
}

export interface OrderComplaintDetail extends OrderComplaint {
  image_urls: string[];
  resolution: string | null;
  updated_at: string;
  assigned_staff: { user_id: number; full_name: string; role_id: number } | null;
  replies: ComplaintReply[];
}

function isOrderComplaint(value: unknown): value is OrderComplaint {
  if (!value || typeof value !== 'object') return false;
  return 'complaint_id' in value && typeof value.complaint_id === 'number' &&
    'order_id' in value && typeof value.order_id === 'number' &&
    'complaint_type' in value && typeof value.complaint_type === 'string' &&
    'description' in value && typeof value.description === 'string' &&
    'status' in value && typeof value.status === 'string' &&
    'created_at' in value && typeof value.created_at === 'string';
}

interface CreateOrderComplaint {
  orderId: number;
  complaintType: string;
  description: string;
  images: ImagePickerAsset[];
}

export const complaintApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyComplaints: builder.query<
      OrderComplaint[],
      { accountId: string }
    >({
      async queryFn(_args, _api, _extraOptions, baseQuery) {
        const complaints: OrderComplaint[] = [];
        const pageSize = 100;
        let page = 1;
        for (;;) {
          const result = await baseQuery({
            url: API_ENDPOINTS.COMPLAINTS.MY,
            params: { page, pageSize },
          });
          if (result.error) return { error: result.error };
          const response = result.data;
          if (!response || typeof response !== 'object' || !('data' in response) ||
              !Array.isArray(response.data) || !response.data.every(isOrderComplaint) || !('total' in response) ||
              typeof response.total !== 'number' || !Number.isSafeInteger(response.total) ||
              response.total < 0 || (response.data.length === 0 && complaints.length < response.total)) {
            return { error: { status: 500, code: 'INVALID_RESPONSE', message: 'Danh sách khiếu nại từ máy chủ không hợp lệ.' } };
          }
          complaints.push(...response.data);
          if (complaints.length >= response.total || response.data.length < pageSize) {
            if (complaints.length < response.total) {
              return { error: { status: 500, code: 'INVALID_RESPONSE', message: 'Danh sách khiếu nại chưa được tải đầy đủ.' } };
            }
            return { data: complaints };
          }
          page += 1;
        }
      },
      providesTags: ['Complaint'],
    }),
    getMyComplaintDetail: builder.query<OrderComplaintDetail, { accountId: string; complaintId: number }>({
      query: ({ complaintId }) => ({ url: API_ENDPOINTS.COMPLAINTS.MY_DETAIL(complaintId) }),
      transformResponse: (response: { data: OrderComplaintDetail }) => response.data,
      providesTags: ['Complaint'],
    }),
    createOrderComplaint: builder.mutation<OrderComplaint, CreateOrderComplaint>({
      async queryFn({ orderId, complaintType, description, images }, _api, _extraOptions, baseQuery) {
        let data: FormData | { complaintType: string; description: string } = { complaintType, description };
        if (images.length > 0) {
          const form = new FormData();
          form.append('complaintType', complaintType);
          form.append('description', description);
          try {
            for (const [index, image] of images.entries()) {
              const name = image.fileName || `complaint-${index + 1}.jpg`;
              if (Platform.OS === 'web') {
                let file = image.file;
                if (!file) {
                  const response = await fetch(image.uri);
                  if (!response.ok) throw new Error('Không thể đọc ảnh đã chọn.');
                  const blob = await response.blob();
                  file = new File([blob], name, { type: blob.type || image.mimeType || 'image/jpeg' });
                }
                form.append('images', file, name);
              } else {
                // React Native accepts URI-backed parts, unlike the DOM FormData type.
                const nativeForm = form as FormData & {
                  append(key: string, value: { uri: string; name: string; type: string }): void;
                };
                nativeForm.append('images', {
                  uri: image.uri,
                  name,
                  type: image.mimeType || 'image/jpeg',
                });
              }
            }
          } catch {
            return { error: { status: 400, code: 'IMAGE_READ_ERROR', message: 'Không thể đọc ảnh đã chọn. Vui lòng chọn lại ảnh.' } };
          }
          data = form;
        }
        const result = await baseQuery({
          url: API_ENDPOINTS.COMPLAINTS.ORDER(orderId),
          method: 'POST',
          data,
        });
        if (result.error) return { error: result.error };
        if (!result.data || typeof result.data !== 'object' || !('data' in result.data) || !result.data.data) {
          return { error: { status: 500, code: 'INVALID_RESPONSE', message: 'Phản hồi khiếu nại từ máy chủ không hợp lệ.' } };
        }
        return { data: result.data.data as OrderComplaint };
      },
      invalidatesTags: (_result, error) => error ? ['Complaint'] : ['Complaint', 'Notification'],
    }),
  }),
});

export const {
  useGetMyComplaintsQuery,
  useGetMyComplaintDetailQuery,
  useCreateOrderComplaintMutation,
} = complaintApi;
