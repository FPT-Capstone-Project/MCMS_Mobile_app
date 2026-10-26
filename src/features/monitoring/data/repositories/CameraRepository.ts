import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import {
  CameraLiveStream,
  StopCameraLiveStreamResult,
} from '../../domain/entities/CameraStream';

interface ApiResponse<T> {
  data: T;
}

export class CameraRepository {
  async startLiveStream(cameraId: number): Promise<CameraLiveStream> {
    try {
      const response = await axiosClient.post<ApiResponse<CameraLiveStream>>(
        API_ENDPOINTS.CAMERAS.LIVE_STREAM(cameraId),
        undefined,
        { params: { channelId: '0', streamId: 0 } }
      );
      const result = response.data?.data;
      if (!result?.stream?.url || result.stream.protocol !== 'hls') {
        throw new AppError('Máy chủ không trả về đường dẫn HLS hợp lệ.', 'API_ERROR', 502);
      }
      return result;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  async stopLiveStream(cameraId: number): Promise<StopCameraLiveStreamResult> {
    try {
      const response = await axiosClient.post<ApiResponse<StopCameraLiveStreamResult>>(
        API_ENDPOINTS.CAMERAS.STOP_LIVE_STREAM(cameraId),
        undefined,
        { params: { channelId: '0' } }
      );
      const result = response.data?.data;
      if (!result || typeof result.stopped !== 'boolean') {
        throw new AppError('Phản hồi dừng luồng camera không hợp lệ.', 'API_ERROR', 502);
      }
      return result;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }
}

export const cameraRepository = new CameraRepository();
