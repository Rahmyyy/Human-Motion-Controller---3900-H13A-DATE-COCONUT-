import { describe, expect, it } from "vitest";
import { localTime, mappingStat, session } from "./testSessions";
import {
  buildThresholdSeries,
  MAX_THRESHOLD_POINTS,
  MAX_THRESHOLD_SERIES,
  orderThresholdMappings,
} from "./thresholdSeries";
import type { PatientSession } from "./types";

const build = (sessions: PatientSession[]) =>
  buildThresholdSeries(sessions, orderThresholdMappings(sessions));

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

    expect(narrowed.mappings.map((mapping) => mapping.id)).toEqual(["m1"]);
    expect(narrowed.mappings.find((mapping) => mapping.id === "m1")?.colorIndex).toBe(
      order.find((mapping) => mapping.id === "m1")?.colorIndex,
    );
  });

  it("backfills a visible mapping when the all-time top five are outside the date range", () => {
    const oldMappings = Array.from({ length: MAX_THRESHOLD_SERIES }, (_, index) =>
      mappingStat({
        mappingId: `old-${index}`,
        mappingName: `Old ${index}`,
        triggerCount: 100 - index,
      }),
    );
    const recent = session({
      id: "recent",
      mappings: [
        mappingStat({ mappingId: "recent-mapping", mappingName: "Recent", triggerCount: 1 }),
      ],
    });
    const allTimeOrder = orderThresholdMappings([
      recent,
      session({ id: "old", mappings: oldMappings }),
    ]);

    const series = buildThresholdSeries([recent], allTimeOrder);

    expect(series.mappings.map((mapping) => mapping.id)).toEqual(["recent-mapping"]);
    expect(series.points[0]?.values.mapping0).toBe(60);
  });

  it("ranks mappings from the thirty sessions that survive the chart cap", () => {
    const recent = Array.from({ length: MAX_THRESHOLD_POINTS }, (_, index) =>
      session({
        id: `recent-${index}`,
        mappings: [mappingStat({ mappingId: "visible", mappingName: "Visible", triggerCount: 1 })],
      }),
    );
    const excluded = session({
      id: "excluded-oldest",
      mappings: [
        mappingStat({ mappingId: "excluded", mappingName: "Excluded", triggerCount: 10_000 }),
      ],
    });
    const sessions = [...recent, excluded];

    const series = buildThresholdSeries(sessions, orderThresholdMappings(sessions));

    expect(series.mappings.map((mapping) => mapping.id)).toEqual(["visible"]);
    expect(series.points).toHaveLength(MAX_THRESHOLD_POINTS);
    expect(series.points.every((point) => point.values.mapping0 === 60)).toBe(true);
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

  it("returns no mappings when the sessions ran on presets without any", () => {
    const series = build([session({ mappings: [] })]);

    expect(series.mappings).toEqual([]);
    expect(series.points).toHaveLength(1);
  });
});
