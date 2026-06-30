import type { RecognitionStatus } from "../hooks/useMovementRecognition";

interface RecognitionStatusPanelProps {
  isLoading: boolean;
  loadError: string | null;
  savedMappingCount: number;
  status: RecognitionStatus;
}

export default function RecognitionStatusPanel({
  isLoading,
  loadError,
  savedMappingCount,
  status,
}: RecognitionStatusPanelProps) {
  return (
    <section className="grid content-start gap-4 rounded-lg border bg-background p-5 shadow-sm">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold text-foreground">Recognition</h2>
        <p className="text-sm text-muted-foreground">{statusText(isLoading, loadError, status)}</p>
      </header>

      <dl className="grid gap-3 text-sm">
        <StatusRow label="Saved mappings" value={String(savedMappingCount)} />
        <StatusRow label="Ready templates" value={String(status.templateCount)} />
        <StatusRow label="Best match" value={status.bestMatch?.name ?? "None"} />
        <StatusRow label="Confidence" value={formatConfidence(status.bestMatch?.confidence)} />
        <StatusRow label="Last trigger" value={status.triggeredMatch?.name ?? "None"} />
      </dl>

      {(loadError || status.error) && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError ?? status.error}
        </p>
      )}
    </section>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-b-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-40 truncate text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function statusText(
  isLoading: boolean,
  loadError: string | null,
  status: RecognitionStatus,
) {
  if (isLoading) return "Loading mappings.";
  if (loadError || status.error) return "Needs attention.";
  if (status.templateCount === 0) return "No movement templates.";
  if (status.triggeredMatch) return `Triggered ${status.triggeredMatch.name}.`;
  return "Ready.";
}

function formatConfidence(confidence: number | undefined) {
  if (confidence === undefined) {
    return "0%";
  }

  return `${Math.round(confidence * 100)}%`;
}
