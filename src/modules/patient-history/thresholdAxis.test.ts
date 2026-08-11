import { describe, expect, it } from "vitest";
import { mappingStat, session } from "./testSessions";
import { buildThresholdSeries, orderThresholdMappings } from "./thresholdSeries";
import type { PatientSession } from "./types";

const build = (sessions: PatientSession[]) =>
  buildThresholdSeries(sessions, orderThresholdMappings(sessions));

/** The threshold chart's y-axis: snapped to tens and never narrower than twenty points. */
describe("the threshold chart's axis", () => {
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

  /** A threshold near the floor cannot widen downwards, so the axis grows upwards instead. */
  it("widens the axis upwards when the thresholds sit at the bottom", () => {
    const series = build([session({ mappings: [mappingStat({ thresholdPercentage: 5 })] })]);

    expect(series.yDomain).toEqual([0, 20]);
  });

  it("falls back to the full axis when nothing was recorded", () => {
    expect(build([]).yDomain).toEqual([0, 100]);
  });
});
