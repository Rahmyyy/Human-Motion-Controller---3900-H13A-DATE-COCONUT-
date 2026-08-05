import { BarChart3, CalendarDays, Clock, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatTotalDuration, type HistorySummary } from "@/modules/patient-history";
import PatientHistoryMetricCard from "./PatientHistoryMetricCard";

interface PatientHistoryMetricsProps {
  isLoading: boolean;
  rangeLabel: string;
  summary: HistorySummary;
}

export default function PatientHistoryMetrics({
  isLoading,
  rangeLabel,
  summary,
}: PatientHistoryMetricsProps) {
  if (isLoading) return <MetricsSkeleton />;

  return (
    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Session summary">
      <PatientHistoryMetricCard
        icon={CalendarDays}
        value={String(summary.completedSessions)}
        label="Completed sessions"
        description={rangeLabel}
      />
      <PatientHistoryMetricCard
        icon={Clock}
        value={formatTotalDuration(summary.totalDurationMs)}
        label="Total session time"
      />
      <PatientHistoryMetricCard
        icon={Target}
        value={String(summary.successfulTriggers)}
        label="Successful triggers"
      />
      <PatientHistoryMetricCard
        icon={BarChart3}
        value={String(summary.averageTriggersPerSession)}
        label="Avg. triggers / session"
      />
    </section>
  );
}

function MetricsSkeleton() {
  return (
    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <Card key={index} className="justify-center py-5 shadow-sm">
          <CardContent className="flex items-center gap-4">
            <span className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="w-full space-y-2">
              <span className="block h-6 w-16 animate-pulse rounded bg-muted" />
              <span className="block h-4 w-28 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
