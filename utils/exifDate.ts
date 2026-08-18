const EXIF_DATETIME = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function firstString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function readExifDateRaw(exif: Record<string, unknown>): string | null {
  const nested = asRecord(exif.Exif) ?? asRecord(exif['{Exif}']);
  return firstString(
    nested?.DateTimeOriginal,
    nested?.DateTimeDigitized,
    nested?.DateTime,
    exif.DateTimeOriginal,
    exif.DateTimeDigitized,
    exif.DateTime,
    exif.datetime,
  );
}

/** Best-effort EXIF timestamp as ISO. Missing/unreadable metadata → null. */
export function parseExifDateTime(exif: Record<string, unknown> | null | undefined): string | null {
  if (!exif) return null;
  const raw = readExifDateRaw(exif);
  if (!raw) return null;
  const m = EXIF_DATETIME.exec(raw);
  if (!m) return null;
  const date = new Date(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    Number(m[4]), Number(m[5]), Number(m[6]),
  );
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
