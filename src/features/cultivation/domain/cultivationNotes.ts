import { statusLabel } from './sessionWorkflow';

// Translate known system defaults only; preserve operator-authored notes.
export function cultivationNote(value?: string | null): string {
  const text = value?.trim() || '';
  const defaults: Record<string, string> = {
    'CULTIVATION STARTED AFTER TRAY ASSIGNMENT': 'Đã gán khay và bắt đầu nuôi trồng.',
    'HARVEST READINESS CONFIRMED': 'Đã đánh giá và xác nhận sẵn sàng thu hoạch.',
    'NOT READY FOR HARVEST': 'Nấm chưa đủ điều kiện thu hoạch, tiếp tục theo dõi.',
    'SPAWN ALLOCATED AFTER PAYMENT; AWAITING FARM ACCEPTANCE': 'Đã cấp phôi sau thanh toán, chờ trang trại tiếp nhận.',
    'NORMAL': 'Bình thường, phát triển ổn định',
    'REGULAR': 'Sinh trưởng bình thường, đúng tiến độ.',
    'REGULAR GROWTH': 'Sinh trưởng bình thường, đúng tiến độ.',
    'GOOD': 'Phát triển tốt', 'OPTIMAL': 'Điều kiện tối ưu',
    'HEALTHY': 'Khỏe mạnh, không phát hiện bất thường',
    'WARNING': 'Cần theo dõi', 'ABNORMAL': 'Bất thường, cần kiểm tra',
    'POOR': 'Kém phát triển',
  };
  const stage = /^Spawn stage changed to ([A-Z_]+)$/i.exec(text);
  if (stage) return `Đã chuyển giai đoạn phôi: ${statusLabel(stage[1])}.`;
  return defaults[text.toUpperCase().replace(/\.$/, '')] ?? text;
}
