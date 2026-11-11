/**
 * Date & Time Utilities for Vietnam Localization (UTC+7)
 */

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Formats a date/timestamp into standard Vietnam Time (Asia/Ho_Chi_Minh, UTC+7).
 * Ensures identical results regardless of device/host timezone:
 *
 * Example:
 * formatVietnamDateTime('2026-11-11T06:24:39.000Z') => "13:24:39 ngày 11/11/2026"
 * formatVietnamDateTime('2026-11-11T13:24:39+07:00') => "13:24:39 ngày 11/11/2026"
 */
export function formatVietnamDateTime(
  input?: string | number | Date | null,
  fallback = ''
): string {
  if (!input) return fallback;

  let date: Date;
  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'number') {
    date = new Date(input);
  } else if (typeof input === 'string') {
    // If string is YYYY-MM-DD HH:mm:ss without T, convert space to T for reliable ISO parsing
    const normalized = input.trim().replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/, '$1T$2');
    date = new Date(normalized);
  } else {
    return fallback;
  }

  if (isNaN(date.getTime())) {
    return typeof input === 'string' ? input : fallback;
  }

  try {
    const formatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: VIETNAM_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    if (!partMap.hour || !partMap.minute || !partMap.second || !partMap.day || !partMap.month || !partMap.year) {
      return date.toLocaleString('vi-VN', { timeZone: VIETNAM_TIMEZONE });
    }

    return `${partMap.hour}:${partMap.minute}:${partMap.second} ngày ${partMap.day}/${partMap.month}/${partMap.year}`;
  } catch {
    // Fallback if Intl.DateTimeFormat or timeZone is not supported
    return date.toLocaleString('vi-VN');
  }
}

