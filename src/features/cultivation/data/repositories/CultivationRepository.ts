import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import {
  CreateDailyTrayInspectionRequest,
  CreateMushroomConditionRequest,
  CultivationRoom,
  CultivationTray,
  DailyInspectionHistoryResponse,
  DailyTrayInspectionImage,
  MushroomCondition,
  MushroomType,
  UpdateMushroomConditionRequest,
} from '../../domain/entities/Cultivation';

/**
 * Repository for Rooms, Trays, Mushroom Types, Conditions, and Daily Tray Inspections
 */
export class CultivationRepository {
  /**
   * Fetch all cultivation rooms
   */
  async getRooms(status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'): Promise<CultivationRoom[]> {
    try {
      const response = await axiosClient.get<CultivationRoom[] | { data: CultivationRoom[] }>(
        API_ENDPOINTS.ROOMS.BASE,
        { params: status ? { status } : undefined }
      );
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return (response.data as { data: CultivationRoom[] })?.data || [];
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch a single room detail
   */
  async getRoom(id: number): Promise<CultivationRoom> {
    try {
      const response = await axiosClient.get<CultivationRoom | { data: CultivationRoom }>(
        API_ENDPOINTS.ROOMS.DETAIL(id)
      );
      if ('room_id' in response.data) {
        return response.data as CultivationRoom;
      }
      return (response.data as { data: CultivationRoom }).data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch cultivation trays, optionally filtered by roomId
   */
  async getTrays(roomId?: number, status?: string): Promise<CultivationTray[]> {
    try {
      const response = await axiosClient.get<CultivationTray[] | { data: CultivationTray[] }>(
        API_ENDPOINTS.TRAYS.BASE,
        { params: { roomId, status } }
      );
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return (response.data as { data: CultivationTray[] })?.data || [];
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch single tray detail
   */
  async getTray(id: number): Promise<CultivationTray> {
    try {
      const response = await axiosClient.get<CultivationTray | { data: CultivationTray }>(
        API_ENDPOINTS.TRAYS.DETAIL(id)
      );
      if ('tray_id' in response.data) {
        return response.data as CultivationTray;
      }
      return (response.data as { data: CultivationTray }).data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch all mushroom types
   */
  async getMushroomTypes(status?: 'ACTIVE' | 'INACTIVE'): Promise<MushroomType[]> {
    try {
      const response = await axiosClient.get<{ data: MushroomType[] } | MushroomType[]>(
        API_ENDPOINTS.MUSHROOM_TYPES.BASE,
        { params: status ? { status } : undefined }
      );
      const rawTypes = Array.isArray(response.data)
        ? response.data
        : (response.data as { data: MushroomType[] })?.data || [];
      return rawTypes.map((mushroomType) => {
        const growingDays = Number(mushroomType.growing_days) || 0;
        const price = Number(mushroomType.price) || 0;
        return {
          ...mushroomType,
          growing_days: growingDays > 0 ? growingDays : 30,
          price: price >= 0 ? price : 0,
          image_url: mushroomType.image_url ? String(mushroomType.image_url).trim() : null,
        };
      });
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch single mushroom type
   */
  async getMushroomType(id: number): Promise<MushroomType> {
    try {
      const response = await axiosClient.get<{ data: MushroomType } | MushroomType>(
        API_ENDPOINTS.MUSHROOM_TYPES.DETAIL(id)
      );
      if ('data' in response.data) {
        return (response.data as { data: MushroomType }).data;
      }
      return response.data as MushroomType;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch mushroom conditions
   */
  async getMushroomConditions(mushroomTypeId?: number): Promise<MushroomCondition[]> {
    try {
      const response = await axiosClient.get<{ data: MushroomCondition[] } | MushroomCondition[]>(
        API_ENDPOINTS.MUSHROOM_CONDITIONS.BASE,
        { params: mushroomTypeId ? { mushroomTypeId } : undefined }
      );
      if ('data' in response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch single mushroom condition
   */
  async getMushroomCondition(id: number): Promise<MushroomCondition> {
    try {
      const response = await axiosClient.get<{ data: MushroomCondition } | MushroomCondition>(
        API_ENDPOINTS.MUSHROOM_CONDITIONS.DETAIL(id)
      );
      if ('data' in response.data) {
        return (response.data as { data: MushroomCondition }).data;
      }
      return response.data as MushroomCondition;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Create a mushroom condition for a mushroom type (POST /api/mushroom-conditions)
   */
  async createMushroomCondition(
    data: CreateMushroomConditionRequest
  ): Promise<MushroomCondition> {
    try {
      const response = await axiosClient.post<
        { message?: string; data: MushroomCondition } | MushroomCondition
      >(API_ENDPOINTS.MUSHROOM_CONDITIONS.BASE, data);

      if ('data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as MushroomCondition;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Update an existing mushroom condition (PUT /api/mushroom-conditions/:id)
   */
  async updateMushroomCondition(
    id: number,
    data: UpdateMushroomConditionRequest
  ): Promise<MushroomCondition> {
    try {
      const response = await axiosClient.put<
        { message?: string; data: MushroomCondition } | MushroomCondition
      >(API_ENDPOINTS.MUSHROOM_CONDITIONS.DETAIL(id), data);

      if ('data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as MushroomCondition;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Delete a mushroom condition (DELETE /api/mushroom-conditions/:id)
   */
  async deleteMushroomCondition(id: number): Promise<void> {
    try {
      await axiosClient.delete(API_ENDPOINTS.MUSHROOM_CONDITIONS.DETAIL(id));
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Create a daily inspection for a specific session tray
   * POST /api/cultivation-sessions/admin/session-trays/:sessionTrayId/inspections
   */
  async createDailyTrayInspection(
    sessionTrayId: number | string,
    payload: CreateDailyTrayInspectionRequest
  ): Promise<number> {
    try {
      const response = await axiosClient.post(
        API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_SESSION_TRAY_INSPECTION(sessionTrayId),
        payload
      );
      const resData = response.data?.data ?? response.data;
      const inspectionId =
        resData?.inspection?.inspection_id ??
        resData?.inspection?.id ??
        resData?.inspectionId ??
        resData?.inspection_id;
      if (!inspectionId) {
        throw new AppError('Máy chủ không trả về mã số biên bản kiểm tra (inspectionId).', 'API_ERROR', 500);
      }
      return Number(inspectionId);
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Upload an image for a daily tray inspection (multipart/form-data)
   * POST /api/cultivation-sessions/admin/inspections/:inspectionId/images
   */
  async uploadDailyTrayInspectionImage(
    inspectionId: number | string,
    imageUri: string,
    caption?: string
  ): Promise<DailyTrayInspectionImage> {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || `daily_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type: mimeType,
      } as any);

      if (caption && caption.trim()) {
        formData.append('caption', caption.trim().slice(0, 500));
      }

      const response = await axiosClient.post(
        API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_INSPECTION_IMAGES(inspectionId),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Get daily inspection history for a whole session
   * GET /api/cultivation-sessions/:sessionId/daily-inspections
   */
  async getDailyInspectionHistory(
    sessionId: number | string,
    page = 1,
    pageSize = 50
  ): Promise<DailyInspectionHistoryResponse> {
    try {
      const response = await axiosClient.get(
        API_ENDPOINTS.CULTIVATION_SESSIONS.DAILY_INSPECTIONS(sessionId),
        { params: { page, pageSize } }
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Get daily inspection history for a single tray
   * GET /api/cultivation-sessions/:sessionId/trays/:sessionTrayId/daily-inspections
   */
  async getTrayDailyInspectionHistory(
    sessionId: number | string,
    sessionTrayId: number | string,
    page = 1,
    pageSize = 50
  ): Promise<DailyInspectionHistoryResponse> {
    try {
      const response = await axiosClient.get(
        API_ENDPOINTS.CULTIVATION_SESSIONS.TRAY_DAILY_INSPECTIONS(sessionId, sessionTrayId),
        { params: { page, pageSize } }
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Upload an image for a spawn inspection (multipart/form-data)
   * POST /api/farm/spawn-inspections/:id/images
   */
  async uploadSpawnInspectionImage(
    inspectionId: number | string,
    imageUri: string,
    caption?: string
  ): Promise<any> {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || `spawn_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type: mimeType,
      } as any);

      if (caption && caption.trim()) {
        formData.append('caption', caption.trim().slice(0, 500));
      }

      const response = await axiosClient.post(
        API_ENDPOINTS.FARM.SPAWN_IMAGES(inspectionId),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }
}

export const cultivationRepository = new CultivationRepository();
