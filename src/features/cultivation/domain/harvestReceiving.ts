import type { HarvestItem } from '../../iot/domain/entities/Iot';
export function receivingBlocker(harvest: HarvestItem): string | null {
  if (harvest.harvest_request_status === 'COMPLETED') return 'Yêu cầu nhận nấm đã hoàn tất. Vui lòng kiểm tra lại đợt thu hoạch.';
  if (!['PICKUP', 'DELIVERY'].includes(harvest.harvest_method || '')) return 'Chưa lưu phương thức nhận nấm. Chọn cách nhận và lưu trước khi bắt đầu thu hoạch.';
  if (harvest.harvest_method === 'PICKUP' && !harvest.scheduled_at) return 'Chưa có lịch khách đến nhận. Hãy bổ sung ngày và giờ hẹn.';
  return null;
}
export function parsePickupTime(date: string, time: string): string | null {
  const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  const t = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) return null;
  const [, day, month, year] = d;
  const [, hour, minute] = t;
  const check = new Date(Date.UTC(+year, +month - 1, +day));
  if (check.getUTCFullYear() !== +year || check.getUTCMonth() !== +month - 1 || check.getUTCDate() !== +day || +hour > 23 || +minute > 59) return null;
  return `${year}-${month}-${day}T${hour}:${minute}:00+07:00`;
}
export function harvestError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  const translations: Record<string, string> = {
    'Choose a receiving method and schedule pickup before starting harvest': 'Chưa đủ thông tin nhận nấm. Hãy lưu phương thức nhận; nếu khách đến nhận, cần có ngày và giờ hẹn.',
    'Resolve quality and severe incidents before harvesting': 'Cần xử lý xong sự cố chất lượng hoặc sự cố nghiêm trọng trước khi thu hoạch.',
    'A receiving request already exists for this cultivation session': 'Phiên đã có yêu cầu nhận nấm. Bấm Tải lại thông tin để xem và chỉnh sửa yêu cầu hiện có.',
    'Completed harvest requests cannot be changed': 'Yêu cầu nhận nấm đã hoàn tất, không thể chỉnh sửa.',
    'Only planned harvests can be started': 'Đợt thu hoạch không còn ở trạng thái chờ bắt đầu. Hãy tải lại thông tin.',
    'Cultivation session must be harvest ready before starting a harvest': 'Phiên chưa được xác nhận sẵn sàng thu hoạch. Hãy kiểm tra lại đánh giá thu hoạch.',
  };
  return translations[message] || fallback;
}
