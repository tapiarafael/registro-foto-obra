/** SQLite datetime('now') and legacy rows: UTC without timezone suffix. */
export const SQLITE_UTC_DATETIME = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/;

const LOCALE = 'pt-BR';

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateLongFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const isoDateFormatter = new Intl.DateTimeFormat('en-CA');

export function nowIsoTimestamp(): string {
  return new Date().toISOString();
}

export function parseStoredTimestamp(value: string): Date {
  const trimmed = value.trim();
  const sqliteMatch = SQLITE_UTC_DATETIME.exec(trimmed);
  if (sqliteMatch) {
    return new Date(`${sqliteMatch[1]}T${sqliteMatch[2]}Z`);
  }
  return new Date(trimmed);
}

export function formatDatePart(isoString: string): string {
  return dateFormatter.format(parseStoredTimestamp(isoString));
}

export function formatTime(isoString: string): string {
  return timeFormatter.format(parseStoredTimestamp(isoString));
}

export function formatDateTime(isoString: string): string {
  return `${formatDatePart(isoString)} ${formatTime(isoString)}`;
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString + 'T00:00:00');
  return dateFormatter.format(d);
}

export function formatDateLong(isoString: string): string {
  const d = new Date(isoString + 'T00:00:00');
  return dateLongFormatter.format(d);
}

export function todayDateString(): string {
  return isoDateFormatter.format(new Date());
}

export function toLocalDateString(iso: string): string {
  return isoDateFormatter.format(parseStoredTimestamp(iso));
}
