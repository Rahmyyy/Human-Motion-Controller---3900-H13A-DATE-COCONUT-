import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { PresetUsage } from "@/modules/patient-history";
import { seriesColor } from "../charts/chartPalette";
import HistoryPanel from "./HistoryPanel";

interface PresetUsagePanelProps {
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
  onShowAllTime: () => void;
  usage: PresetUsage;
}

// Slice colours are set per Cell: the keys are preset ids, which are not safe to interpolate
// into a CSS custom property name.
const usageConfig = { sessionCount: { label: "Sessions" } } satisfies ChartConfig;

export default function PresetUsagePanel({
  error,
  isLoading,
  onRetry,
  onShowAllTime,
  usage,
}: PresetUsagePanelProps) {
  return (
    <HistoryPanel
      title="Preset usage"
      skeletonClassName="h-[240px]"
      emptyMessage="No preset activity in this range."
      error={error}
      isEmpty={usage.slices.length === 0}
      isLoading={isLoading}
      onRetry={onRetry}
      onShowAllTime={onShowAllTime}
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <ChartContainer config={usageConfig} className="aspect-square h-[176px] shrink-0">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="label" />} />
            <Pie
              data={usage.slices}
              dataKey="sessionCount"
              nameKey="label"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {usage.slices.map((slice) => (
                <Cell key={slice.key} fill={seriesColor(slice.colorIndex)} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold text-foreground">{usage.topPresetName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {usage.topPresetSessionCount}{" "}
            {usage.topPresetSessionCount === 1 ? "session" : "sessions"}
            {" · "}
            {usage.topPresetMappingCount}{" "}
            {usage.topPresetMappingCount === 1 ? "mapping" : "mappings"}
          </p>

          <ul className="mt-4 space-y-2">
            {usage.slices.map((slice) => (
              <li key={slice.key} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: seriesColor(slice.colorIndex) }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-foreground">{slice.label}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {slice.sessionCount} ({slice.percentage}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </HistoryPanel>
  );
}
