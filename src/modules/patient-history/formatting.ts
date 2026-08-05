/**
 * Date and duration formatting for the patient history page.
 *
 * Built from `Date` getters rather than `Intl.DateTimeFormat`: `Intl` output depends on the
 * host locale, which would make these values vary by machine and the tests vary with them.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

const pad = (value: number) => String(value).padStart(2, "0");

/** A single session's length: "12m 36s", or "1h 05m 03s" once it passes an hour. */
export function formatSessionDuration(durationMs: number): string {
  const safeMs = Math.max(0, durationMs);
  const hours = Math.floor(safeMs / MS_PER_HOUR);
  const minutes = Math.floor((safeMs % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((safeMs % MS_PER_MINUTE) / MS_PER_SECOND);

  if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  return `${minutes}m ${pad(seconds)}s`;
}

/** Time across many sessions: "1h 42m", or just "42m" below an hour. */
export function formatTotalDuration(durationMs: number): string {
  const safeMs = Math.max(0, durationMs);
  const hours = Math.floor(safeMs / MS_PER_HOUR);
  const minutes = Math.floor((safeMs % MS_PER_HOUR) / MS_PER_MINUTE);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** "4 Aug 2026, 10:42 AM" — the table's date column and chart tooltips. */
export function formatSessionTimestamp(epochMs: number): string {
  const date = new Date(epochMs);
  const hours = date.getHours();
  const meridiem = hours < 12 ? "AM" : "PM";
  // Midnight and noon are both 12 on a 12-hour clock, not 0.
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;

  return (
    `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ` +
    `${displayHours}:${pad(date.getMinutes())} ${meridiem}`
  );
}

/** "4 Aug" — the chart axis tick. */
export function formatAxisDate(epochMs: number): string {
  const date = new Date(epochMs);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** Duration as minutes to one decimal, for the activity chart's line series. */
export function toDurationMinutes(durationMs: number): number {
  return Math.round((Math.max(0, durationMs) / MS_PER_MINUTE) * 10) / 10;
}
