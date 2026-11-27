import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';
import { axiosClient } from '../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import type { GROWTH_STAGE_LABELS } from '../../../core/constants/growthStages';

export type GrowthStage = keyof typeof GROWTH_STAGE_LABELS;
export interface TrayScan {
  tray: { tray_id: number; tray_code: string; status: string };
  sessions: {
    session_id: number;
    session_tray_id: number;
    mushroom_name: string;
    status: string;
    harvest_status: string;
  }[];
}
export interface GrowthOverview {
  trays: {
    tray_id: number;
    tray_code: string;
    last_inspection_at: string | null;
    growth_status: GrowthStage | null;
  }[];
  synchronization: { total_trays: number; updated_trays: number; is_synchronized: boolean };
}
const admin = '/api/cultivation-sessions/admin';
async function trayForm(
  fields: Record<string, string>,
  photos: ImagePickerAsset[],
  field = 'images'
) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value.trim()) form.append(key, value.trim());
  });
  for (const photo of photos) {
    const name = photo.fileName || 'tray.jpg';
    if (Platform.OS === 'web') {
      form.append(field, photo.file || (await (await fetch(photo.uri)).blob()), name);
    } else {
      const native = form as FormData & {
        append(key: string, file: { uri: string; name: string; type: string }): void;
      };
      native.append(field, { uri: photo.uri, name, type: photo.mimeType || 'image/jpeg' });
    }
  }
  return form;
}
export const trayQr = {
  async scan(qrToken: string) {
    return (
      await axiosClient.post<{ data: TrayScan }>('/api/cultivation-trays/qr/scan', { qrToken })
    ).data.data;
  },
  async overview(sessionId: number) {
    return (await axiosClient.get<{ data: GrowthOverview }>(`${admin}/${sessionId}/growth-status`))
      .data.data;
  },
  async growth(fields: Record<string, string>, photos: ImagePickerAsset[]) {
    const path = photos.length ? 'inspections' : 'qr-growth-update';
    await axiosClient.post(`${admin}/${path}`, await trayForm(fields, photos));
  },
  async attachPhoto(inspectionId: number, photo: ImagePickerAsset) {
    await axiosClient.post(
      API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_INSPECTION_IMAGES(inspectionId),
      await trayForm({}, [photo], 'image')
    );
  },
  async issue(fields: Record<string, string>, photos: ImagePickerAsset[]) {
    return (
      await axiosClient.post<{ data: { issue_id: number } }>(
        '/api/issues/qr',
        await trayForm(fields, photos)
      )
    ).data.data;
  },
  async sanitize(token: string) {
    await axiosClient.post(
      `/api/cultivation-trays/qr/${encodeURIComponent(token)}/complete-sanitation`
    );
  },
};
