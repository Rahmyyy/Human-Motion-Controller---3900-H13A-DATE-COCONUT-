import { describe, expect, it } from "vitest";
import { mappingStat, session } from "./testSessions";
import { MAX_THRESHOLD_SERIES, orderThresholdMappings } from "./thresholdSeries";

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
