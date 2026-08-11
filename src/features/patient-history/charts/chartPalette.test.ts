import { describe, expect, it } from "vitest";
import { CHART_SERIES_COLORS, MUTED_SERIES_COLOR, seriesColor } from "./chartPalette";

describe("chart palette", () => {
  it("draws its series colours from the theme", () => {
    expect(CHART_SERIES_COLORS).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ]);
  });

  it("hands out the colours in order", () => {
    expect(seriesColor(0)).toBe("var(--chart-1)");
    expect(seriesColor(4)).toBe("var(--chart-5)");
  });

  /** More series than colours is normal; wrapping keeps every series drawable. */
  it("wraps around once the palette runs out", () => {
    expect(seriesColor(5)).toBe(seriesColor(0));
    expect(seriesColor(12)).toBe(seriesColor(2));
  });

  /** A folded "everything else" slice is deliberately not one of the real series. */
  it("mutes a series with no index of its own", () => {
    expect(seriesColor(null)).toBe(MUTED_SERIES_COLOR);
    expect(CHART_SERIES_COLORS).not.toContain(MUTED_SERIES_COLOR);
  });
});
