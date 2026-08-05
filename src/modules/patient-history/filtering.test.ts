import { describe, expect, it } from "vitest";
import { dateRangeStartMs, filterSessions, presetFilterOptions } from "./filtering";
import { localTime, session } from "./testSessions";
import { ALL_PRESETS, type HistoryFilter } from "./types";

const NOW = localTime(2026, 7, 4, 16, 0);
const filter = (overrides: Partial<HistoryFilter> = {}): HistoryFilter => ({
  dateRange: "30d",
  presetId: ALL_PRESETS,
  ...overrides,
});

describe("dateRangeStartMs", () => {
  it("starts a range at local midnight", () => {
    expect(dateRangeStartMs("7d", NOW)).toBe(localTime(2026, 6, 29));
  });

  it("counts today as the first of the range's days", () => {
    expect(dateRangeStartMs("30d", NOW)).toBe(localTime(2026, 6, 6));
  });

  it("has no start for all time", () => {
    expect(dateRangeStartMs("all", NOW)).toBeNull();
  });
});

describe("filterSessions", () => {
  it("includes a session recorded just after midnight on the earliest day of the range", () => {
    const earliest = session({ startedAtMs: localTime(2026, 6, 29, 0, 1) });

    expect(filterSessions([earliest], filter({ dateRange: "7d" }), NOW)).toHaveLength(1);
  });

  it("excludes a session recorded just before the range begins", () => {
    const tooOld = session({ startedAtMs: localTime(2026, 6, 28, 23, 59) });

    expect(filterSessions([tooOld], filter({ dateRange: "7d" }), NOW)).toHaveLength(0);
  });

  it("includes a session recorded later today than the moment of filtering", () => {
    const laterToday = session({ startedAtMs: localTime(2026, 7, 4, 23, 30) });

    expect(filterSessions([laterToday], filter({ dateRange: "7d" }), NOW)).toHaveLength(1);
  });

  it("returns every session for all time", () => {
    const ancient = session({ startedAtMs: localTime(2020, 0, 1) });

    expect(filterSessions([ancient], filter({ dateRange: "all" }), NOW)).toHaveLength(1);
  });

  it("keeps only the selected preset's sessions", () => {
    const sessions = [session({ id: "a" }), session({ id: "b", presetId: "preset-2" })];

    const kept = filterSessions(sessions, filter({ presetId: "preset-2" }), NOW);

    expect(kept.map((entry) => entry.id)).toEqual(["b"]);
  });

  it("combines the date range and the preset filter", () => {
    const sessions = [
      session({ id: "recent-other", presetId: "preset-2" }),
      session({ id: "old-wanted", startedAtMs: localTime(2026, 0, 1) }),
      session({ id: "recent-wanted" }),
    ];

    const kept = filterSessions(sessions, filter({ dateRange: "7d", presetId: "preset-1" }), NOW);

    expect(kept.map((entry) => entry.id)).toEqual(["recent-wanted"]);
  });

  it("returns nothing when no session falls in the range", () => {
    const ancient = session({ startedAtMs: localTime(2020, 0, 1) });

    expect(filterSessions([ancient], filter({ dateRange: "30d" }), NOW)).toEqual([]);
  });
});

describe("presetFilterOptions", () => {
  it("lists all presets first, then each preset used, most used first", () => {
    const sessions = [
      session({ id: "a", presetId: "preset-2", presetName: "tennis" }),
      session({ id: "b" }),
      session({ id: "c" }),
    ];

    expect(presetFilterOptions(sessions)).toEqual([
      { id: ALL_PRESETS, name: "All presets", sessionCount: 3 },
      { id: "preset-1", name: "mario kart", sessionCount: 2 },
      { id: "preset-2", name: "tennis", sessionCount: 1 },
    ]);
  });

  it("labels a preset with its most recent name snapshot", () => {
    const sessions = [
      session({ id: "newest", presetName: "mario kart 2" }),
      session({ id: "oldest", presetName: "mario kart" }),
    ];

    expect(presetFilterOptions(sessions)[1]?.name).toBe("mario kart 2");
  });

  it("keeps two presets that share a name separate", () => {
    const sessions = [
      session({ id: "a", presetId: "preset-1", presetName: "mario kart" }),
      session({ id: "b", presetId: "preset-2", presetName: "mario kart" }),
    ];

    expect(presetFilterOptions(sessions)).toHaveLength(3);
  });

  it("offers only all presets when there are no sessions", () => {
    expect(presetFilterOptions([])).toEqual([
      { id: ALL_PRESETS, name: "All presets", sessionCount: 0 },
    ]);
  });
});
