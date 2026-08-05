import { describe, expect, it } from "vitest";
import { localTime, mappingStat, session } from "./testSessions";
import {
  buildThresholdSeries,
  MAX_THRESHOLD_SERIES,
  orderThresholdMappings,
} from "./thresholdSeries";
import type { PatientSession } from "./types";

const build = (sessions: PatientSession[]) =>
  buildThresholdSeries(sessions, orderThresholdMappings(sessions));

describe("orderThresholdMappings", () => {
  it("ranks mappings by total triggers and assigns palette colours in order", () => {
    const sessions = [
      session({
        mappings: [
          mappingStat({ mappingId: "m1", mappingName: "Accelerate", triggerCount: 5 }),
          mappingStat({ mappingId: "m2", mappingName: "Steer left", triggerCount: 20 }),
        ],
      }),
    ];

    expect(orderThresholdMappings(sessions)).toEqual([
      { id: "m2", seriesKey: "mapping0", label: "Steer left", colorIndex: 0 },
      { id: "m1", seriesKey: "mapping1", label: "Accelerate", colorIndex: 1 },
    ]);
  });

  it("labels a mapping with its most recent name snapshot", () => {
    const sessions = [
      session({ id: "newest", mappings: [mappingStat({ mappingName: "Accelerate hard" })] }),
      session({ id: "oldest", mappings: [mappingStat({ mappingName: "Accelerate" })] }),
    ];

    expect(orderThresholdMappings(sessions)[0]?.label).toBe("Accelerate hard");
  });

  it("disambiguates same-named mappings from different presets", () => {
    const sessions = [
      session({
        id: "a",
        presetName: "mario kart",
        mappings: [mappingStat({ mappingId: "m1", mappingName: "Accelerate", triggerCount: 9 })],
      }),
      session({
        id: "b",
        presetId: "preset-2",
        presetName: "tennis",
        mappings: [mappingStat({ mappingId: "m2", mappingName: "Accelerate", triggerCount: 4 })],
      }),
    ];

    expect(orderThresholdMappings(sessions).map((mapping) => mapping.label)).toEqual([
      "Accelerate (mario kart)",
      "Accelerate (tennis)",
    ]);
  });

  it("caps the chart at the most-triggered mappings", () => {
    const mappings = Array.from({ length: MAX_THRESHOLD_SERIES + 2 }, (_, index) =>
      mappingStat({ mappingId: `m${index}`, mappingName: `Move ${index}`, triggerCount: index }),
    );

    expect(orderThresholdMappings([session({ mappings })])).toHaveLength(MAX_THRESHOLD_SERIES);
  });
});

describe("buildThresholdSeries", () => {
  it("plots one value per mapping per session, oldest first", () => {
    const sessions = [
      session({
        id: "newest",
        startedAtMs: localTime(2026, 7, 4),
        mappings: [mappingStat({ thresholdPercentage: 70 })],
      }),
      session({
        id: "oldest",
        startedAtMs: localTime(2026, 6, 24),
        mappings: [mappingStat({ thresholdPercentage: 60 })],
      }),
    ];

    const series = build(sessions);

    expect(series.points.map((point) => point.sessionId)).toEqual(["oldest", "newest"]);
    expect(series.points.map((point) => point.values.mapping0)).toEqual([60, 70]);
  });

  it("leaves a null where a session did not include the mapping", () => {
    const sessions = [
      session({
        id: "tennis",
        presetId: "preset-2",
        presetName: "tennis",
        mappings: [mappingStat({ mappingId: "m2", mappingName: "Serve", triggerCount: 1 })],
      }),
      session({
        id: "kart",
        mappings: [mappingStat({ mappingId: "m1", thresholdPercentage: 60, triggerCount: 9 })],
      }),
    ];

    const series = build(sessions);
    const accelerate = series.mappings.find((mapping) => mapping.id === "m1");

    expect(series.points[0]?.values[accelerate!.seriesKey]).toBe(60);
    expect(series.points[1]?.values[accelerate!.seriesKey]).toBeNull();
  });

  it("keeps a mapping's colour when the date range narrows around it", () => {
    const all = [
      session({
        id: "recent",
        mappings: [mappingStat({ mappingId: "m1", mappingName: "Accelerate", triggerCount: 2 })],
      }),
      session({
        id: "old",
        mappings: [mappingStat({ mappingId: "m2", mappingName: "Steer", triggerCount: 50 })],
      }),
    ];
    const order = orderThresholdMappings(all);

    // "Steer" outranks "Accelerate" overall, but is absent from the narrowed range.
    const narrowed = buildThresholdSeries([all[0]!], order);

    expect(narrowed.mappings.find((mapping) => mapping.id === "m1")?.colorIndex).toBe(
      order.find((mapping) => mapping.id === "m1")?.colorIndex,
    );
  });

  it("tracks a mapping by id when its name changes between sessions", () => {
    const sessions = [
      session({
        id: "newest",
        mappings: [mappingStat({ mappingName: "Accelerate hard", thresholdPercentage: 70 })],
      }),
      session({
        id: "oldest",
        mappings: [mappingStat({ mappingName: "Accelerate", thresholdPercentage: 60 })],
      }),
    ];

    const series = build(sessions);

    expect(series.mappings).toHaveLength(1);
    expect(series.points.map((point) => point.values.mapping0)).toEqual([60, 70]);
  });

  it("snaps the axis outward to multiples of ten", () => {
    const sessions = [
      session({ id: "a", mappings: [mappingStat({ thresholdPercentage: 52 })] }),
      session({ id: "b", mappings: [mappingStat({ thresholdPercentage: 78 })] }),
    ];

    expect(build(sessions).yDomain).toEqual([50, 80]);
  });

  it("widens the axis when every threshold is identical", () => {
    const series = build([session({ mappings: [mappingStat({ thresholdPercentage: 65 })] })]);
    const [low, high] = series.yDomain;

    expect(high - low).toBeGreaterThanOrEqual(20);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(100);
  });

  it("falls back to the full axis when nothing was recorded", () => {
    expect(build([]).yDomain).toEqual([0, 100]);
  });

  it("returns no mappings when the sessions ran on presets without any", () => {
    const series = build([session({ mappings: [] })]);

    expect(series.mappings).toEqual([]);
    expect(series.points).toHaveLength(1);
  });
});
