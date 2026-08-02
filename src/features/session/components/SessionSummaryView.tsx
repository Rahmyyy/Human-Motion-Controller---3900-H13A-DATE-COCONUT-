import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPatient } from "@/features/patients/api/patientsApi";
import { getMovementMappings } from "@/features/movement-mapping/api/movementMappingsApi";
import { getPreset } from "@/features/presets/api/presetsApi";
import type { SessionSummary } from "../services/sessionSummary.types";
import SessionSummaryStats from "./SessionSummaryStats";
import SessionSummaryMappingList from "./SessionSummaryMappingList";

interface SessionSummaryViewProps {
  summary: SessionSummary;
  patientId: string;
  presetId: string;
  onDone: () => void;
}

interface SummaryContext {
  patientName: string;
  presetName: string;
  rows: Array<{ id: string; name: string; keybind: string; triggerCount: number }>;
}

export default function SessionSummaryView({
  summary,
  patientId,
  presetId,
  onDone,
}: SessionSummaryViewProps) {
  const [context, setContext] = useState<SummaryContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getPatient(patientId),
      getPreset(presetId, patientId),
      getMovementMappings(presetId),
    ])
      .then(([patient, preset, mappings]) => {
        if (!isMounted) return;
        setContext({
          patientName: patient.displayName,
          presetName: preset.name,
          rows: mappings.map((mapping) => ({
            id: mapping.id,
            name: mapping.name,
            keybind: mapping.keybind,
            triggerCount: summary.triggerCountsByMapping[mapping.id] ?? 0,
          })),
        });
        setLoadError(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [patientId, presetId, summary.triggerCountsByMapping]);

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
