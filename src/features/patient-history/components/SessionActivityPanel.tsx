import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SessionActivity } from "@/modules/patient-history";
import HistoryPanel from "./HistoryPanel";

interface SessionActivityPanelProps {
  activity: SessionActivity;
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
  onShowAllTime: () => void;
}

const activityConfig = {
  triggerCount: { label: "Successful triggers", color: "var(--chart-1)" },
  durationMinutes: { label: "Duration", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function SessionActivityPanel({
  activity,
  error,
  isLoading,
  onRetry,
  onShowAllTime,
}: SessionActivityPanelProps) {
  const axisLabels = new Map(activity.points.map((point) => [point.sessionId, point.axisLabel]));

  return (
    <HistoryPanel
      title="Session activity"
      description={
        activity.truncatedFrom
          ? `Showing the ${activity.points.length} most recent of ${activity.truncatedFrom} sessions.`
          : undefined
      }
      action={<ActivityLegend />}
      error={error}
      isEmpty={activity.points.length === 0}
      isLoading={isLoading}
      onRetry={onRetry}
      onShowAllTime={onShowAllTime}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Successful triggers</span>
        <span>Duration (min)</span>
      </div>
      <ChartContainer config={activityConfig} className="mt-1 aspect-auto h-[240px] w-full">
        <ComposedChart data={activity.points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            // Keep same-day sessions distinct to Recharts' hover lookup while retaining the
            // compact date labels shown to the user.
            dataKey="sessionId"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
            tickFormatter={(sessionId: string) => axisLabels.get(sessionId) ?? ""}
          />
          <YAxis
            yAxisId="triggers"
            width={34}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="duration"
            orientation="right"
            width={34}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="dot"
                // The axis tick repeats for same-day sessions, so the tooltip carries the time.
                labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltipLabel ?? ""}
              />
            }
          />
          <Bar
            yAxisId="triggers"
            dataKey="triggerCount"
            fill="var(--color-triggerCount)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Line
            yAxisId="duration"
            dataKey="durationMinutes"
            type="monotone"
            stroke="var(--color-durationMinutes)"
            strokeWidth={2}
            // Card-filled dots keep the line readable where it crosses a bar.
            dot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ChartContainer>
    </HistoryPanel>
  );
}

function ActivityLegend() {
  return (
    <ul className="flex items-center gap-4 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[2px] bg-[var(--chart-1)]" aria-hidden="true" />
        Successful triggers
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full bg-[var(--chart-2)]" aria-hidden="true" />
        Duration
      </li>
    </ul>
  );
}
