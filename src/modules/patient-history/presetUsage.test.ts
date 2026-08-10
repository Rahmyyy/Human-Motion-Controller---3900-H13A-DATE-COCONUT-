import { describe, expect, it } from "vitest";
import { buildPresetUsage, OTHER_PRESETS_KEY } from "./presetUsage";
import { mappingStat, session } from "./testSessions";

describe("buildPresetUsage", () => {
  it("splits sessions across presets with counts and percentages", () => {
    const sessions = [
      session({ id: "a" }),
      session({ id: "b" }),
      session({ id: "c", presetId: "preset-2", presetName: "tennis" }),
      session({ id: "d", presetId: "preset-2", presetName: "tennis" }),
    ];

    const slices = buildPresetUsage(sessions).slices;

    expect(slices).toHaveLength(2);
    expect(slices[0]).toMatchObject({ label: "mario kart", sessionCount: 2, percentage: 50 });
    expect(slices[1]).toMatchObject({ label: "tennis", sessionCount: 2, percentage: 50 });
  });

  it("reports a single preset as the whole of the usage", () => {
    const usage = buildPresetUsage([session({ id: "a" }), session({ id: "b" })]);

    expect(usage.slices[0]?.percentage).toBe(100);
  });

  it("makes rounded percentages sum to exactly one hundred", () => {
    const sessions = [
      session({ id: "a", presetId: "p1", presetName: "one" }),
      session({ id: "b", presetId: "p2", presetName: "two" }),
      session({ id: "c", presetId: "p3", presetName: "three" }),
    ];

    const total = buildPresetUsage(sessions).slices.reduce(
      (sum, slice) => sum + slice.percentage,
      0,
    );

    expect(total).toBe(100);
  });

  it("folds presets past the third into one other-presets slice", () => {
    const sessions = ["p1", "p2", "p3", "p4", "p5"].map((presetId, index) =>
      session({ id: `s${index}`, presetId, presetName: presetId }),
    );

    const slices = buildPresetUsage(sessions).slices;

    expect(slices).toHaveLength(4);
    expect(slices[3]).toMatchObject({
      key: OTHER_PRESETS_KEY,
      label: "Other presets",
      sessionCount: 2,
      colorIndex: null,
    });
  });

  it("omits the other-presets slice when nothing falls into it", () => {
    const slices = buildPresetUsage([session()]).slices;

    expect(slices.some((slice) => slice.key === OTHER_PRESETS_KEY)).toBe(false);
  });

  it("names the headline preset and counts its distinct mappings", () => {
    const sessions = [
      session({
        id: "a",
        mappings: [mappingStat({ mappingId: "m1" }), mappingStat({ mappingId: "m2" })],
      }),
      session({
        id: "b",
        mappings: [mappingStat({ mappingId: "m2" }), mappingStat({ mappingId: "m3" })],
      }),
    ];

    const usage = buildPresetUsage(sessions);

    expect(usage.topPresetName).toBe("mario kart");
    expect(usage.topPresetSessionCount).toBe(2);
    expect(usage.topPresetMappingCount).toBe(3);
  });

  it("keeps a deleted preset's snapshot name in the legend", () => {
    const usage = buildPresetUsage([session({ presetName: "deleted preset" })]);

    expect(usage.slices[0]?.label).toBe("deleted preset");
  });

  it("labels a preset with its most recent name snapshot", () => {
    const sessions = [
      session({ id: "newest", presetName: "mario kart 2" }),
      session({ id: "oldest", presetName: "mario kart" }),
    ];

    expect(buildPresetUsage(sessions).slices[0]?.label).toBe("mario kart 2");
  });

  /** Only three slices get their own colour; the rest are pooled so the donut stays readable. */
  it("pools the presets beyond the coloured three into one slice", () => {
    const sessions = [
      ...twoSessionsOn("preset-1", "mario kart"),
      ...twoSessionsOn("preset-2", "chess"),
      ...twoSessionsOn("preset-3", "tetris"),
      session({ id: "d", presetId: "preset-4", presetName: "pong" }),
      session({ id: "e", presetId: "preset-5", presetName: "snake" }),
    ];

    const slices = buildPresetUsage(sessions).slices;

    expect(slices).toHaveLength(4);
    expect(
      slices
        .slice(0, 3)
        .map((slice) => slice.label)
        .sort(),
    ).toEqual(["chess", "mario kart", "tetris"]);
    expect(slices[3]).toMatchObject({ key: "other", sessionCount: 2, colorIndex: null });
  });

  it("still totals a hundred percent once the pooled slice is included", () => {
    const sessions = [
      ...twoSessionsOn("preset-1", "mario kart"),
      ...twoSessionsOn("preset-2", "chess"),
      ...twoSessionsOn("preset-3", "tetris"),
      session({ id: "d", presetId: "preset-4", presetName: "pong" }),
    ];

    const slices = buildPresetUsage(sessions).slices;

    expect(slices.reduce((total, slice) => total + slice.percentage, 0)).toBe(100);
  });

  it("returns an empty usage when there are no sessions", () => {
    expect(buildPresetUsage([])).toEqual({
      slices: [],
      topPresetName: null,
      topPresetSessionCount: 0,
      topPresetMappingCount: 0,
    });
  });
});

/** Two sessions on one preset, so it outranks the single-session presets pooled into "Other". */
function twoSessionsOn(presetId: string, presetName: string) {
  return [
    session({ id: `${presetId}-a`, presetId, presetName }),
    session({ id: `${presetId}-b`, presetId, presetName }),
  ];
}
