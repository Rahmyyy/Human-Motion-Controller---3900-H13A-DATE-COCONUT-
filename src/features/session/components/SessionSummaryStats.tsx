interface SessionSummaryStatsProps {
  elapsedMs: number;
  triggerCount: number;
}

export default function SessionSummaryStats({ elapsedMs, triggerCount }: SessionSummaryStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="grid content-start gap-1 rounded-lg border bg-background p-5 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Session Duration
        </span>
        <span className="text-3xl font-semibold text-foreground">{formatDuration(elapsedMs)}</span>
      </section>

      <section className="grid content-start gap-1 rounded-lg border bg-background p-5 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Successful Triggers
        </span>
        <span className="text-3xl font-semibold text-foreground">{triggerCount}</span>
      </section>
    </div>
  );
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
