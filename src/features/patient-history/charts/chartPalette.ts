/** The theme's chart series colours, in the order a chart should reach for them. */
export const CHART_SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** Used for aggregate slices that stand for "everything else". */
export const MUTED_SERIES_COLOR = "var(--muted-foreground)";

export const seriesColor = (index: number | null) =>
  index === null ? MUTED_SERIES_COLOR : CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length];
