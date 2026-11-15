import type { CultivationSessionAdmin } from '../../iot/domain/entities/Iot';

export const SESSION_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chưa ủ tơ' },
  { value: 'INCUBATING', label: 'Ủ tơ' },
  { value: 'READY_FOR_CULTIVATION', label: 'Chờ gán khay' },
  { value: 'CULTIVATING', label: 'Đang trồng' },
  { value: 'HARVEST_READY', label: 'Sẵn sàng thu hoạch' },
  { value: 'HARVESTING', label: 'Đang thu hoạch' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];
export const GROWTH_FILTERS = [
  { value: 'ALL', label: 'Mọi giai đoạn' },
  { value: 'FRUITING_INITIATION', label: 'Bật mầm' },
  { value: 'PINNING', label: 'Ra nụ' },
  { value: 'YOUNG_FRUITING', label: 'Nấm non' },
  { value: 'MATURATION', label: 'Trưởng thành' },
  { value: 'UNRECORDED', label: 'Chưa ghi nhận' },
];
const labels: Record<string, string> = {
  ...Object.fromEntries([...SESSION_FILTERS, ...GROWTH_FILTERS].map(x => [x.value, x.label])),
  SPAWN_PENDING: 'Chờ ủ tơ', SPAWN_ISSUED: 'Đã xuất phôi', SPAWN_RESTING: 'Đang ủ tơ', MYCELIAL_DEVELOPMENT: 'Phát triển tơ',
  NOT_READY: 'Chưa sẵn sàng', READY: 'Sẵn sàng', HARVESTED: 'Đã thu hoạch',
  IN_PROGRESS: 'Đang thực hiện', ISSUED: 'Đã xuất phôi', NOT_ISSUED: 'Chờ xuất phôi',
  PENDING: 'Chưa ủ tơ', CONFIRMED: 'Đã xác nhận', PAID: 'Đã thanh toán',
  PROCESSING: 'Đang xử lý', UNPAID: 'Chưa thanh toán', REFUNDED: 'Đã hoàn tiền',
  REFUND_PENDING: 'Chờ hoàn tiền', FAILED: 'Thất bại',
};
export function statusLabel(value?: string | null): string {
  return value ? labels[value.trim().toUpperCase()] ?? 'Chưa xác định' : 'Chưa ghi nhận';
}
const lifecycleLabels: Record<string, string> = {
  RECEIVED: 'Phôi đã được tiếp nhận',
  PENDING: 'Phôi đã được tiếp nhận',
  RESTING: 'Phôi đang nghỉ và ổn định',
  SPAWN_RESTING: 'Phôi đang nghỉ và ổn định',
  DEVELOPING: 'Tơ nấm đang phát triển',
  MYCELIAL_DEVELOPMENT: 'Tơ nấm đang phát triển',
  READY_FOR_CULTIVATION: 'Sẵn sàng đưa vào khay trồng',
  FRUITING_INITIATION: 'Bắt đầu kích hoạt ra quả thể',
  PINNING: 'Mầm nấm bắt đầu xuất hiện',
  YOUNG_FRUITING: 'Nấm non đang phát triển',
  MATURATION: 'Nấm trưởng thành, đang kiểm tra chất lượng',
  HARVEST_READY: 'Sẵn sàng thu hoạch',
  HARVESTING: 'Đang thu hoạch',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
};

export function lifecycleStatusLabel(value?: string | null): string {
  if (!value) return 'Chưa ghi nhận';
  const normalized = value.trim().toUpperCase();
  return lifecycleLabels[normalized] ?? statusLabel(normalized);
}

// Readiness is a separate backend field, not a lifecycle transition.
export function sessionGroup(session: CultivationSessionAdmin): string {
  if (['COMPLETED', 'CANCELLED', 'HARVESTING'].includes(session.status)) return session.status;
  if (session.status === 'HARVEST_READY' || (session.status === 'CULTIVATING' &&
      (session.harvest_status === 'HARVEST_READY' || session.harvest_ready === true))) return 'HARVEST_READY';
  if (['SPAWN_RESTING', 'MYCELIAL_DEVELOPMENT'].includes(session.status)) return 'INCUBATING';
  return session.status;
}
export function growthStage(session: CultivationSessionAdmin): string {
  const stage = session.current_stage || session.growth_status;
  return GROWTH_FILTERS.some(x => x.value === stage) ? stage! : 'UNRECORDED';
}
export function compareSessions(a: CultivationSessionAdmin, b: CultivationSessionAdmin): number {
  const rank = (s: CultivationSessionAdmin) => {
    const index = SESSION_FILTERS.findIndex(x => x.value === sessionGroup(s));
    return index < 0 ? SESSION_FILTERS.length : index;
  };
  const date = (s: CultivationSessionAdmin) => Date.parse(s.created_at || '') || 0;
  return rank(a) - rank(b) || date(b) - date(a) || b.session_id - a.session_id;
}
