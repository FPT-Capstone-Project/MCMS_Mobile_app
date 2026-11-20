import type { CustomerTrayCard } from '../../tray/domain/entities/Tray';
import type { CustomerSession, CustomerSessionTray } from './entities/Order';

export function customerSessionTrayDetail(session: CustomerSession, tray: CustomerSessionTray): CustomerTrayCard {
  const active = tray.assignment_status.toUpperCase() === 'ACTIVE';
  return {
    id: tray.tray_id,
    code: tray.tray_code || `Khay #${tray.tray_id}`,
    usage: 'MY_CULTIVATION',
    mushroomName: session.mushroom_name,
    sessionId: session.session_id,
    sessionTrayId: tray.session_tray_id,
    orderId: session.order_id,
    floorId: active ? tray.floor_id ?? undefined : undefined,
    floorNumber: active ? tray.floor_number ?? undefined : undefined,
  };
}

export function customerSessionDeviceHistoryAvailable(session: CustomerSession): boolean {
  return session.trays.every((tray) => tray.assignment_status.toUpperCase() === 'ACTIVE');
}

export function customerTrayAssignmentLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'Đang thuộc phiên';
    case 'RELEASED': return 'Đã trả khay';
    default: return status || 'Chưa ghi nhận';
  }
}

export function customerTrayStatusLabel(status: string | null): string {
  switch (status?.toUpperCase()) {
    case 'AVAILABLE': return 'Sẵn sàng';
    case 'OCCUPIED': return 'Đang sử dụng';
    case 'MAINTENANCE': return 'Đang bảo trì';
    case 'INACTIVE': return 'Ngừng hoạt động';
    default: return status || 'Chưa ghi nhận';
  }
}

export function customerTrayLocation(tray: CustomerSessionTray): string {
  if (tray.assignment_status.toUpperCase() !== 'ACTIVE') {
    return 'Không lưu vị trí của khay đã trả';
  }
  const floor = tray.floor_name || (tray.floor_number != null ? `Tầng ${tray.floor_number}` : null);
  const position = tray.row_number != null && tray.column_number != null
    ? `Hàng ${tray.row_number}, cột ${tray.column_number}`
    : null;
  return [tray.room_name, floor, position].filter(Boolean).join(' · ') || 'Chưa cập nhật vị trí';
}
