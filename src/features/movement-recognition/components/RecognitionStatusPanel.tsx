import { cn } from "@/lib/utils";
import type { RecognitionStatus } from "../hooks/useMovementRecognition";

interface RecognitionStatusPanelProps {
  isLoading: boolean;
  loadError: string | null;
  status: RecognitionStatus;
}

export default function RecognitionStatusPanel({
  isLoading,
  loadError,
  status,
}: RecognitionStatusPanelProps) {
  return (
    <section className="grid content-start gap-4 rounded-lg border bg-background p-5 shadow-sm">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold text-foreground">Recognition</h2>
        <p className="text-sm text-muted-foreground">{statusText(isLoading, loadError, status)}</p>
      </header>

      {status.mappingStatuses.length > 0 ? (
        <ul className="grid gap-3">
          {status.mappingStatuses.map((mapping) => (
            <li
              key={mapping.id}
              className={cn(
                "rounded-lg border p-3",
                mapping.isActive && "border-primary/40 bg-primary/10",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {mapping.name}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Triggering: {mapping.keybind}
                  </div>
                </div>
                <div className="text-right text-sm font-medium text-foreground">
                  {formatConfidence(mapping.confidence)}
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {mapping.isActive ? "Active" : "Inactive"}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No mappings saved.</p>
      )}

      {(loadError || status.error) && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError ?? status.error}
        </p>
      )}
    </section>
  );
}

function statusText(
  isLoading: boolean,
  loadError: string | null,
  status: RecognitionStatus,
) {
  if (isLoading) return "Loading mappings.";
  if (loadError || status.error) return "Needs attention.";
  if (status.mappingStatuses.length === 0) return "No mappings.";
  return "Ready.";
}

function formatConfidence(confidence: number | undefined) {
  if (confidence === undefined) {
    return "0%";
  }

  return `${Math.round(confidence * 100)}%`;
}
