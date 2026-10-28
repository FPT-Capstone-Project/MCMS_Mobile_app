import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import {
  CameraLiveStream,
  ImouPlayerConfiguration,
  StopCameraLiveStreamResult,
} from '../../domain/entities/CameraStream';

interface ApiResponse<T> {
  data: T;
}

export class CameraRepository {
  async getImouPlayerConfiguration(cameraId: number): Promise<ImouPlayerConfiguration> {
    try {
      const response = await axiosClient.get<ApiResponse<ImouPlayerConfiguration>>(
        API_ENDPOINTS.CAMERAS.IMOU_PLAYER_TOKEN(cameraId),
        { params: { channelId: '0', streamId: 0 } }
      );
      const result = response.data?.data;
      if (
        !result
        || typeof result.cameraId !== 'number'
        || typeof result.deviceId !== 'string'
        || !result.deviceId
        || typeof result.channelId !== 'string'
        || typeof result.streamId !== 'number'
        || result.type !== 1
        || typeof result.kitToken !== 'string'
        || !result.kitToken
      ) {
        throw new AppError('Máy chủ không trả về thông tin ImouPlayer hợp lệ.', 'API_ERROR', 502);
      }
      return result;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  async startLiveStream(cameraId: number, streamId: number = 0): Promise<CameraLiveStream> {
    try {
      const response = await axiosClient.get<ApiResponse<CameraLiveStream>>(
        API_ENDPOINTS.CAMERAS.LIVE_STREAM(cameraId),
        { params: { channelId: '0', streamId: String(streamId) } }
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
