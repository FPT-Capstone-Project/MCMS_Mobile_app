export type FanAutoState = 'STOPPED' | 'OFF_PENDING' | 'READY' | 'ON_PENDING' | 'RUNNING' | 'RESTING';
export const FAN_AUTO_LABELS: Record<FanAutoState, string> = {
  STOPPED: 'Đã dừng', OFF_PENDING: 'Chờ xác nhận quạt tắt', READY: 'Chuẩn bị chạy',
  ON_PENDING: 'Chờ xác nhận quạt bật', RUNNING: 'Đang chạy', RESTING: 'Đang nghỉ',
};
export function validFanMinutes(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 1440 ? number : null;
}
