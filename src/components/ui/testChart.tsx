import { render } from "@testing-library/react";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "./chart";

/** One coloured series and one label-only series, which is enough for every lookup path. */
export const chartConfig: ChartConfig = {
  sessions: { label: "Sessions", color: "#2563eb" },
  march: { label: "March" },
};

type TooltipEntry = NonNullable<
  React.ComponentProps<typeof ChartTooltipContent>["payload"]
>[number];

export const tooltipItem = {
  dataKey: "sessions",
  name: "sessions",
  value: 1234,
  color: "#2563eb",
} as TooltipEntry;

/** Recharts' payload type demands internal bookkeeping fields the tooltip never reads. */
export function tooltipEntry(overrides: Record<string, unknown> = {}): TooltipEntry {
  return { ...tooltipItem, ...overrides } as TooltipEntry;
}

/**
 * Tooltip and legend content read their series config from the container's context, so they can
 * only be rendered inside one. The container hands its single child to a ResponsiveContainer,
 * which is why the part under test goes in as that child rather than as a sibling of a chart.
 */
export function renderInChart(config: ChartConfig, part: React.ReactElement) {
  return render(
    <ChartContainer config={config}>
      {part as React.ComponentProps<typeof ChartContainer>["children"]}
    </ChartContainer>,
  );
}

export function renderTooltip(
  props: Partial<React.ComponentProps<typeof ChartTooltipContent>> = {},
  config: ChartConfig = chartConfig,
) {
  return renderInChart(config, <ChartTooltipContent active payload={[tooltipItem]} {...props} />);
}
