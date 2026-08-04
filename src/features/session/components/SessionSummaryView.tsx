import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSummaryContextLoader, type SessionSummary } from "@/modules/live-session";
import SessionSummaryStats from "./SessionSummaryStats";
import SessionSummaryMappingList from "./SessionSummaryMappingList";

interface SessionSummaryViewProps {
  summary: SessionSummary;
  patientId: string;
  presetId: string;
  onDone: () => void;
}

export default function SessionSummaryView({
  summary,
  patientId,
  presetId,
  onDone,
}: SessionSummaryViewProps) {
  const [loader] = useState(createSummaryContextLoader);
  const { context, isLoading, loadError } = useSyncExternalStore(
    loader.subscribe,
    loader.getSnapshot,
    loader.getSnapshot,
  );

  useEffect(() => {
    void loader.start(patientId, presetId, summary);
    return loader.dispose;
  }, [loader, patientId, presetId, summary]);

  return (
    <section className="min-h-screen bg-background px-8 py-10">
      <div className="mx-auto grid max-w-4xl gap-6">
        <header className="grid gap-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Session Summary
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading session details…"
              : context
                ? `${context.presetName} · ${context.patientName}`
                : "Review this session's outcome and adjust mappings as needed."}
          </p>
        </header>

        <SessionSummaryStats elapsedMs={summary.elapsedMs} triggerCount={summary.triggerCount} />

        <SessionSummaryMappingList
          rows={context?.rows ?? []}
          isLoading={isLoading}
          loadError={loadError}
          patientId={patientId}
          presetId={presetId}
        />

        <div className="flex justify-end">
          <Button type="button" size="lg" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    </section>
  );
}
