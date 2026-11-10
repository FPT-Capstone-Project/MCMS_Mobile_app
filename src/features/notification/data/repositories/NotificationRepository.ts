import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import {
  ConfirmRepairResponse,
  CustomerNotification,
  NotificationListResponse,
} from '../../domain/entities/Notification';

interface NotificationListDto {
  data: CustomerNotification[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  meta: {
    unread_count: number;
  };
}

export class NotificationRepository {
  async getNotifications(options: {
    page?: number;
    pageSize?: number;
    isRead?: boolean;
  } = {}): Promise<NotificationListResponse> {
    try {
      const response = await axiosClient.get<NotificationListDto>(
        API_ENDPOINTS.NOTIFICATIONS.BASE,
        {
          params: {
            page: options.page ?? 1,
            pageSize: options.pageSize ?? 20,
            ...(options.isRead === undefined ? {} : { isRead: options.isRead }),
          },
        }
      );
      const result = response.data;
      if (!Array.isArray(result?.data) || !result.pagination || !result.meta) {
        throw new AppError('Dữ liệu thông báo từ máy chủ không hợp lệ.', 'API_ERROR', 500);
      }
      const normalizedNotifications = result.data.map((item) => ({
        ...item,
        device_incident: item.device_incident
          ? {
              ...item.device_incident,
              can_confirm_repair: Boolean(item.device_incident.can_confirm_repair),
            }
          : null,
      }));

      return {
        notifications: normalizedNotifications,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        unreadCount: result.meta.unread_count,
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  async markAsRead(notificationId: number): Promise<CustomerNotification> {
    try {
      const response = await axiosClient.patch<{ data: CustomerNotification }>(
        API_ENDPOINTS.NOTIFICATIONS.READ(notificationId)
      );
      if (!response.data?.data) {
        throw new AppError('Không cập nhật được trạng thái thông báo.', 'API_ERROR', 500);
      }
      return response.data.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  async markAllAsRead(): Promise<number> {
    try {
      const response = await axiosClient.patch<{ data: { updated: number } }>(
        API_ENDPOINTS.NOTIFICATIONS.READ_ALL
      );
      if (typeof response.data?.data?.updated !== 'number') {
        throw new AppError('Phản hồi đánh dấu thông báo đã đọc không hợp lệ.', 'API_ERROR', 500);
      }
      return response.data.data.updated;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Confirm repair for IoT device incident
   * Endpoint: PATCH /api/notifications/:notificationId/confirm-repair
   * Payload: { repairNote?: string } (or {} if no note provided)
   */
  async confirmRepair(
    notificationId: number,
    repairNote?: string
  ): Promise<ConfirmRepairResponse> {
    try {
      const payload: Record<string, string> = {};
      if (repairNote && repairNote.trim()) {
        payload.repairNote = repairNote.trim();
      }

      const response = await axiosClient.patch<ConfirmRepairResponse>(
        API_ENDPOINTS.NOTIFICATIONS.CONFIRM_REPAIR(notificationId),
        payload
      );
      return response.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }
}

export const notificationRepository = new NotificationRepository();
