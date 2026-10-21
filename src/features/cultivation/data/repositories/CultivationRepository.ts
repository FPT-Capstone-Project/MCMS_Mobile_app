import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import {
  CultivationRoom,
  CultivationTray,
  MushroomCondition,
  MushroomType,
} from '../../domain/entities/Cultivation';

/**
 * Repository for Rooms, Trays, Mushroom Types, and Conditions
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
}

export const cultivationRepository = new CultivationRepository();
