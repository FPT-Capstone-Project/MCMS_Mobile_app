import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import {
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
      return {
        notifications: result.data,
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
}

export const notificationRepository = new NotificationRepository();
