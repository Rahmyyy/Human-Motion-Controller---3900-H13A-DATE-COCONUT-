import { describe, expect, it } from "vitest";
import {
  formatAxisDate,
  formatSessionDuration,
  formatSessionTimestamp,
  formatTotalDuration,
  toDurationMinutes,
} from "./formatting";

/** Built from local-time parts so assertions hold in any timezone. */
const localTime = (year: number, monthIndex: number, day: number, hours = 0, minutes = 0): number =>
  new Date(year, monthIndex, day, hours, minutes).getTime();

describe("formatSessionDuration", () => {
  it("formats a session under an hour as minutes and padded seconds", () => {
    expect(formatSessionDuration(756_000)).toBe("12m 36s");
  });

  it("pads single-digit seconds", () => {
    expect(formatSessionDuration(65_000)).toBe("1m 05s");
  });

  it("adds an hours segment once the session passes an hour", () => {
    expect(formatSessionDuration(3_903_000)).toBe("1h 05m 03s");
  });

  it("formats a zero-length session as zero rather than blank", () => {
    expect(formatSessionDuration(0)).toBe("0m 00s");
  });
});

describe("formatTotalDuration", () => {
  it("reports total time in hours and minutes", () => {
    expect(formatTotalDuration(6_120_000)).toBe("1h 42m");
  });

  it("drops the hours segment below an hour", () => {
    expect(formatTotalDuration(2_520_000)).toBe("42m");
  });

  it("reports no recorded time as zero minutes", () => {
    expect(formatTotalDuration(0)).toBe("0m");
  });
});

describe("formatSessionTimestamp", () => {
  it("formats a timestamp as day, month, year and 12-hour time", () => {
    expect(formatSessionTimestamp(localTime(2026, 7, 4, 10, 42))).toBe("4 Aug 2026, 10:42 AM");
  });

  it("writes an afternoon time as PM", () => {
    expect(formatSessionTimestamp(localTime(2026, 7, 1, 14, 15))).toBe("1 Aug 2026, 2:15 PM");
  });

  it("writes midnight as 12 AM rather than 0 AM", () => {
    expect(formatSessionTimestamp(localTime(2026, 7, 4, 0, 5))).toBe("4 Aug 2026, 12:05 AM");
  });

  it("writes noon as 12 PM", () => {
    expect(formatSessionTimestamp(localTime(2026, 7, 4, 12, 0))).toBe("4 Aug 2026, 12:00 PM");
  });

  it("pads single-digit minutes", () => {
    expect(formatSessionTimestamp(localTime(2026, 6, 28, 9, 3))).toBe("28 Jul 2026, 9:03 AM");
  });
});

describe("formatAxisDate", () => {
  it("formats an axis tick as day and short month", () => {
    expect(formatAxisDate(localTime(2026, 6, 24, 15, 5))).toBe("24 Jul");
  });
});

describe("toDurationMinutes", () => {
  it("converts a duration to minutes with one decimal", () => {
    expect(toDurationMinutes(756_000)).toBe(12.6);
  });

  it("rounds to the nearest tenth of a minute", () => {
    expect(toDurationMinutes(65_000)).toBe(1.1);
  });
});
