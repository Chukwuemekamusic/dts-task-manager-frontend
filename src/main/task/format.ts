const LONDON = 'Europe/London';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: LONDON,
});

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: LONDON,
});

/**
 * Formats an ISO-8601 timestamp for display to a caseworker in Europe/London
 * local terms, e.g. "1 June 2026 at 6:00pm". Returns the raw input unchanged if
 * it is not a parseable date so a bad value can never throw mid-render.
 */
export function formatDateTime(iso: string | undefined): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const time = timeFormat.format(date).replace(/\s/g, '').toLowerCase();
  return `${dateFormat.format(date)} at ${time}`;
}
