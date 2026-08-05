import { describe, expect, it } from "vitest";
import {
  combineLocalDateAndTime,
  getLocalDayRange,
  getNextHalfHour,
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
});
