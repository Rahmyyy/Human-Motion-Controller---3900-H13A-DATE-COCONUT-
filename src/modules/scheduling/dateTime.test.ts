import { describe, expect, it } from "vitest";
import {
  combineLocalDateAndTime,
  getLocalDayRange,
  getNextHalfHour,
  isSameLocalDay,
  toTimeInputValue,
} from "./dateTime";

describe("scheduling date helpers", () => {
  it("returns local start-inclusive and next-day-exclusive bounds", () => {
    const reference = new Date(2026, 7, 5, 14, 23);
    const range = getLocalDayRange(reference);

    expect(new Date(range.dayStartMs)).toEqual(new Date(2026, 7, 5));
    expect(new Date(range.dayEndMs)).toEqual(new Date(2026, 7, 6));
  });

  it("defaults to the next half-hour", () => {
    const next = getNextHalfHour(new Date(2026, 7, 5, 14, 44, 15));

    expect(next).toEqual(new Date(2026, 7, 5, 15, 0));
    expect(toTimeInputValue(next)).toBe("15:00");
  });

  it("combines a local date and valid time", () => {
    expect(combineLocalDateAndTime(new Date(2026, 7, 5), "09:30")).toBe(
      new Date(2026, 7, 5, 9, 30).getTime(),
    );
    expect(combineLocalDateAndTime(new Date(2026, 7, 5), "25:00")).toBeNull();
  });

  it("rejects a time the clock could never show", () => {
    const day = new Date(2026, 7, 5);

    expect(combineLocalDateAndTime(day, "-1:00")).toBeNull();
    expect(combineLocalDateAndTime(day, "09:60")).toBeNull();
    expect(combineLocalDateAndTime(day, "09:-5")).toBeNull();
  });

  it("rejects a time that is not a time at all", () => {
    const day = new Date(2026, 7, 5);

    expect(combineLocalDateAndTime(day, "morning")).toBeNull();
    expect(combineLocalDateAndTime(day, "09")).toBeNull();
    expect(combineLocalDateAndTime(day, "09:30.5")).toBeNull();
  });

  it("keeps the boundaries of the day", () => {
    expect(combineLocalDateAndTime(new Date(2026, 7, 5), "00:00")).toBe(
      new Date(2026, 7, 5).getTime(),
    );
    expect(combineLocalDateAndTime(new Date(2026, 7, 5), "23:59")).toBe(
      new Date(2026, 7, 5, 23, 59).getTime(),
    );
  });

  it("rolls a half-hour boundary on to the next slot", () => {
    expect(getNextHalfHour(new Date(2026, 7, 5, 14, 30))).toEqual(new Date(2026, 7, 5, 15, 0));
  });

  it("pads a single-digit time for the time input", () => {
    expect(toTimeInputValue(new Date(2026, 7, 5, 9, 5))).toBe("09:05");
  });
});

describe("isSameLocalDay", () => {
  it("treats two times on the same date as the same day", () => {
    expect(isSameLocalDay(new Date(2026, 7, 5, 0, 0), new Date(2026, 7, 5, 23, 59))).toBe(true);
  });

  it("treats a different date as a different day", () => {
    expect(isSameLocalDay(new Date(2026, 7, 5), new Date(2026, 7, 6))).toBe(false);
    expect(isSameLocalDay(new Date(2026, 7, 5), new Date(2026, 8, 5))).toBe(false);
    expect(isSameLocalDay(new Date(2026, 7, 5), new Date(2025, 7, 5))).toBe(false);
  });
});
