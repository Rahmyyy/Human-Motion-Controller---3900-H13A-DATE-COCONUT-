import type { LocalDayRange } from "./types";

export function getLocalDayRange(reference = new Date()): LocalDayRange {
  const dayStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const dayEnd = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + 1);
  return { dayStartMs: dayStart.getTime(), dayEndMs: dayEnd.getTime() };
}

export function getNextHalfHour(reference = new Date()) {
  const next = new Date(reference);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() - (next.getMinutes() % 30) + 30);
  return next;
}

export function combineLocalDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
  return combined.getTime();
}

export function toTimeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
