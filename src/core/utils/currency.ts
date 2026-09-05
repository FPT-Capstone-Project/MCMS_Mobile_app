/**
 * Currency & Formatting Utilities for Vietnamese Localization
 */

/**
 * Formats a numeric amount into Vietnamese Dong (VND) currency format.
 * Example: formatVND(30000) => "30.000đ"
 * Example: formatVND(150000) => "150.000đ"
 */
export function formatVND(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0đ';
  }
  // Format with dots as thousands separators
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}đ`;
}

/**
 * Formats a date range into standard Vietnamese format DD/MM/YYYY - DD/MM/YYYY
 * Example: formatDateRange('2026-09-01', '2026-09-15') => "01/09/2026 - 15/09/2026"
 */
export function formatDateRange(
  startDate: string | Date,
  endDate: string | Date
): string {
  const formatDate = (d: string | Date): string => {
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return typeof d === 'string' ? d : '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}
