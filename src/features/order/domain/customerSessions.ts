import type { CustomerTrayCard } from '../../tray/domain/entities/Tray';
import type {
  CustomerCultivationStatus,
  CustomerSessionFilter,
  CustomerSession,
  CustomerSessionTray,
} from './entities/Order';

type CustomerCultivationSession = CustomerCultivationStatus['sessions'][number];

export function customerSessionIsHarvestReady(session: CustomerCultivationSession): boolean {
  return session.status.toUpperCase() === 'HARVEST_READY' ||
    session.harvest_status?.toUpperCase() === 'HARVEST_READY';
}

export function customerCanChooseHarvestMethod(session: CustomerCultivationSession): boolean {
  const status = session.status.toUpperCase();
  return (
    customerSessionIsHarvestReady(session) &&
    !['COMPLETED', 'CANCELLED'].includes(status) &&
    session.harvest_request_status?.toUpperCase() !== 'COMPLETED' &&
    (!session.harvest_method || session.harvest_request_status === 'CANCELLED')
  );
}

export function customerSessionNeedsReceivingFollowup(session: CustomerCultivationSession): boolean {
  const status = session.status.toUpperCase();
  return (
    customerSessionIsHarvestReady(session) &&
    !['COMPLETED', 'CANCELLED'].includes(status) &&
    session.harvest_request_status?.toUpperCase() !== 'COMPLETED'
  );
}

export function customerSessionMatchesFilter(
  session: CustomerCultivationSession,
  filter: CustomerSessionFilter | 'RECEIVING_METHOD',
): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'RECEIVING_METHOD') return customerSessionNeedsReceivingFollowup(session);
  const status = session.status.toUpperCase();
  return filter === 'COMPLETED'
    ? status === 'COMPLETED'
    : !['COMPLETED', 'CANCELLED'].includes(status) && !customerSessionIsHarvestReady(session);
}

export function customerSessionTrayLabel(session: CustomerSession, tray: CustomerSessionTray): string {
  const index = session.trays.findIndex(
    (sessionTray) => sessionTray.session_tray_id === tray.session_tray_id
  );
  return `Khay ${index >= 0 ? index + 1 : tray.tray_id}`;
}

export function customerSessionTrayDetail(session: CustomerSession, tray: CustomerSessionTray): CustomerTrayCard {
  const active = tray.assignment_status.toUpperCase() === 'ACTIVE';
  return {
    id: tray.tray_id,
    code: customerSessionTrayLabel(session, tray),
    usage: 'MY_CULTIVATION',
    mushroomName: session.mushroom_name,
    sessionId: session.session_id,
    sessionTrayId: tray.session_tray_id,
    orderId: session.order_id,
    floorId: active ? tray.floor_id ?? undefined : undefined,
    floorNumber: active ? tray.floor_number ?? undefined : undefined,
    floorName: active ? tray.floor_name ?? undefined : undefined,
    rowNumber: active ? tray.row_number ?? undefined : undefined,
    columnNumber: active ? tray.column_number ?? undefined : undefined,
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
