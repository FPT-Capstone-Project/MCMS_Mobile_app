const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function getDateParts(value: Date | string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const hour = Number(values.hour);
  const minute = Number(values.minute);

  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return { year, month, day, hour, minute };
}

function toDateKey({ year, month, day }: { year: number; month: number; day: number }): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getVietnamDateKey(value: Date | string): string | null {
  const parts = getDateParts(value);
  return parts ? toDateKey(parts) : null;
}

export function getCustomerPickupDateKeys(harvestReadyAt: string | null | undefined, now = new Date()): string[] {
  if (!harvestReadyAt) return [];
  const readyDate = getVietnamDateKey(harvestReadyAt);
  const today = getVietnamDateKey(now);
  if (!readyDate || !today) return [];

  const firstDate = today > readyDate ? today : readyDate;
  const lastDate = addDays(readyDate, 3);
  if (firstDate > lastDate) return [];

  const dates: string[] = [];
  for (let date = firstDate; date <= lastDate; date = addDays(date, 1)) {
    if (getCustomerPickupHourOptions(date, now).length > 0) dates.push(date);
  }
  return dates;
}

export function getCustomerPickupHourOptions(dateKey: string, now = new Date()): string[] {
  return Array.from({ length: 11 }, (_, index) => String(index + 7).padStart(2, '0'))
    .filter((hour) => getCustomerPickupMinuteOptions(dateKey, hour, now).length > 0);
}

export function getCustomerPickupMinuteOptions(dateKey: string, hour: string, now = new Date()): string[] {
  const hourNumber = Number(hour);
  if (!Number.isInteger(hourNumber) || hourNumber < 7 || hourNumber > 17) return [];

  const today = getVietnamDateKey(now);
  if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || dateKey < today) return [];
  const minutes = hourNumber === 17 ? ['00'] : ['00', '15', '30', '45'];
  return minutes.filter((minute) =>
    new Date(`${dateKey}T${String(hourNumber).padStart(2, '0')}:${minute}:00+07:00`).getTime() > now.getTime());
}

export function getCustomerPickupTimeOptions(dateKey: string, now = new Date()): string[] {
  return getCustomerPickupHourOptions(dateKey, now)
    .flatMap((hour) => getCustomerPickupMinuteOptions(dateKey, hour, now).map((minute) => `${hour}:${minute}`));
}

export function canCustomerUpdateHarvestMethod(harvestReadyAt: string | null | undefined, now = new Date()): boolean {
  if (!harvestReadyAt) return false;
  const readyDate = getVietnamDateKey(harvestReadyAt);
  const today = getVietnamDateKey(now);
  if (!readyDate || !today) return false;

  return today >= readyDate && today <= addDays(readyDate, 1);
}

export function formatVietnamDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    timeZone: 'UTC',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export function toVietnamDateTime(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00+07:00`).toISOString();
}
