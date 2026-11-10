export type NotificationType =
  | 'OPERATOR_MESSAGE'
  | 'MUSHROOM_DISEASE'
  | 'DEVICE_ISSUE'
  | 'DEVICE_INCIDENT';

export type DeviceType = 'MASTER' | 'NODE' | 'SENSOR';
export type DeviceIncidentStatus = 'OPEN' | 'RESOLVED';

export interface DeviceIncident {
  incident_id: number;
  device_type: DeviceType | string;
  status: DeviceIncidentStatus | string;
  reason: string;
  floor_id?: number | null;
  master_id?: number | null;
  node_address?: number | null;
  sensor_address?: number | null;
  detected_at: string;
  resolved_at?: string | null;
  resolved_by?: number | string | null;
  repair_note?: string | null;
  can_confirm_repair?: boolean;
}

export interface CustomerNotification {
  notification_id: number;
  notification_type: NotificationType | string;
  reference_type?: string | null;
  reference_id?: number | string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  rental_id?: number | null;
  device_incident?: DeviceIncident | null;
}

export interface NotificationListResponse {
  notifications: CustomerNotification[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unreadCount: number;
}

export interface ConfirmRepairResponse {
  message: string;
  data: DeviceIncident;
}
