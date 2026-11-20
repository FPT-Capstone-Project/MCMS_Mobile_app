import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { baseApi } from '../../../core/api/baseApi';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import type { ExpertConsultation, ExpertIssue } from '../domain/entities/expert-consultation';

export async function photoForm(photo: ImagePickerAsset, fields: Record<string, string> = {}) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  const name = photo.fileName || 'consultation.jpg';
  if (Platform.OS === 'web') {
    const blob = photo.file || await (await fetch(photo.uri)).blob();
    form.append('file', blob, name);
  } else {
    const native = form as FormData & {
      append(key: string, value: { uri: string; name: string; type: string }): void;
    };
    native.append('file', { uri: photo.uri, name, type: photo.mimeType || 'image/jpeg' });
  }
  return form;
}

export const consultationChatApi = baseApi.enhanceEndpoints({ addTagTypes: ['Consultation'] }).injectEndpoints({
  endpoints: (builder) => ({
    expertIssueContext: builder.query<ExpertIssue, string | number>({
      query: (id) => ({ url: API_ENDPOINTS.EXPERT.ISSUE(id) }),
      transformResponse: (response: { data: ExpertIssue }) => response.data,
    }),
    consultationChat: builder.query<ExpertConsultation, string | number>({
      query: (id) => ({ url: API_ENDPOINTS.EXPERT.CONSULTATION(id) }),
      transformResponse: (response: { data: ExpertConsultation }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Consultation', id }],
    }),
    sendConsultationChat: builder.mutation<unknown, { id: string | number; message: string; photo?: ImagePickerAsset | null }>({
      async queryFn({ id, message, photo }, _api, _options, query) {
        try {
          const data = photo ? await photoForm(photo, { message }) : { message };
          return await query({ url: API_ENDPOINTS.EXPERT.MESSAGES(id), method: 'POST', data });
        } catch {
          return { error: { code: 'PHOTO_READ_ERROR', message: 'Không đọc được ảnh. Vui lòng chọn lại.' } };
        }
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Consultation', id }],
    }),
  }),
});
export const { useConsultationChatQuery, useSendConsultationChatMutation, useExpertIssueContextQuery } = consultationChatApi;
