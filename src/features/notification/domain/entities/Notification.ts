export type NotificationType = 'OPERATOR_MESSAGE' | 'MUSHROOM_DISEASE' | 'DEVICE_ISSUE';

export interface CustomerNotification {
  notification_id: number;
  notification_type: NotificationType | string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  rental_id: number | null;
}

export interface NotificationListResponse {
  notifications: CustomerNotification[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unreadCount: number;
}
