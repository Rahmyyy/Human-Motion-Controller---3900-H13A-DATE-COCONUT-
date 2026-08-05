import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ThresholdSeries } from "@/modules/patient-history";
import { seriesColor } from "../charts/chartPalette";
import HistoryPanel from "./HistoryPanel";

interface ThresholdChangesPanelProps {
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
  onShowAllTime: () => void;
  series: ThresholdSeries;
}

export default function ThresholdChangesPanel({
  error,
  isLoading,
  onRetry,
  onShowAllTime,
  series,
}: ThresholdChangesPanelProps) {
  const config = Object.fromEntries(
    series.mappings.map((mapping) => [
      mapping.seriesKey,
      { label: mapping.label, color: seriesColor(mapping.colorIndex) },
    ]),
  ) satisfies ChartConfig;

  const hasSessions = series.points.length > 0;
  const axisLabels = new Map(series.points.map((point) => [point.sessionId, point.axisLabel]));

  return (
    <HistoryPanel
      title="Threshold changes"
      description="Movement thresholds used across completed sessions."
      skeletonClassName="h-[240px]"
      action={<ThresholdLegend series={series} />}
      // Sessions with no mappings behind them are a real state, and "no data" would misdescribe it.
      emptyMessage={
        hasSessions
          ? "These sessions ran on presets without movement mappings, so there are no thresholds to plot."
          : "No sessions in this range."
      }
      error={error}
      isEmpty={series.mappings.length === 0}
      isLoading={isLoading}
      onRetry={onRetry}
      onShowAllTime={hasSessions ? undefined : onShowAllTime}
    >
      <p className="text-xs text-muted-foreground">Threshold (%)</p>
      <ChartContainer config={config} className="mt-1 aspect-auto h-[240px] w-full">
        <LineChart data={series.points} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            // The short date is not unique when a patient completes multiple sessions in one
            // day. Recharts uses this key to resolve hover payloads, so use the session identity
            // for interaction and format it back to the short date for display.
            dataKey="sessionId"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(sessionId: string) => axisLabels.get(sessionId) ?? ""}
          />
          <YAxis
            domain={series.yDomain}
            width={46}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value}%`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltipLabel ?? ""}
              />
            }
          />
          {series.mappings.map((mapping) => (
            <Line
              key={mapping.id}
              // Dot path into the point's series values; `name` keeps the tooltip resolving
              // against the config, which is keyed by the bare series key.
              dataKey={`values.${mapping.seriesKey}`}
              name={mapping.seriesKey}
              type="linear"
              // A mapping missing from a session was unobserved, not removed, so the line bridges.
              connectNulls
              stroke={`var(--color-${mapping.seriesKey})`}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </HistoryPanel>
  );
}

function ThresholdLegend({ series }: { series: ThresholdSeries }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.mappings.map((mapping) => (
        <li key={mapping.id} className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4 rounded-full"
            style={{ backgroundColor: seriesColor(mapping.colorIndex) }}
            aria-hidden="true"
          />
          {mapping.label}
        </li>
      ))}
    </ul>
  );
}
