export function sanitizeDateToYYYYMMDD(rawDate?: string | null): string {
  if (!rawDate) return '';
  const trimmed = String(rawDate).trim();
  if (!trimmed) return '';

  // Already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Starts with YYYY-MM-DD (e.g. ISO 2026-11-20T... or 2026-11-20 00:00:00)
  if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try standard Date parsing
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

/**
 * Formats YYYY-MM-DD to DD/MM/YYYY for Vietnamese display
 */
export function formatVietnameseDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const sanitized = sanitizeDateToYYYYMMDD(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sanitized)) return dateStr;
  const [y, m, d] = sanitized.split('-');
  return `${d}/${m}/${y}`;
}
