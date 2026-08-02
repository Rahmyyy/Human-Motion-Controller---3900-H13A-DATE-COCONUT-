import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

export interface SessionSummaryMappingRow {
  id: string;
  name: string;
  keybind: string;
  triggerCount: number;
}

interface SessionSummaryMappingListProps {
  rows: SessionSummaryMappingRow[];
  isLoading: boolean;
  loadError: string | null;
  patientId: string;
  presetId: string;
}

export default function SessionSummaryMappingList({
  rows,
  isLoading,
  loadError,
  patientId,
  presetId,
}: SessionSummaryMappingListProps) {
  return (
    <section className="grid content-start gap-4 rounded-lg border bg-background p-5 shadow-sm">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold text-foreground">Movement Breakdown</h2>
        <p className="text-sm text-muted-foreground">
          Triggers per movement mapping. Select a movement to adjust its tolerance or keybind.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading mappings…</p>
      ) : loadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : rows.length > 0 ? (
        <ul className="grid gap-3">
          {rows.map((row) => {
            const wasTriggered = row.triggerCount > 0;

            return (
              <li key={row.id}>
                <Link
                  to={`/patients/${patientId}/presets/${presetId}/movements/${row.id}/edit`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "truncate text-sm font-medium",
                        wasTriggered ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {row.name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {wasTriggered ? `Triggered ${row.triggerCount}x` : "Not triggered"}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <kbd className="rounded-md bg-slate-700 px-2.5 py-1 font-mono text-xs font-semibold text-white">
                      {row.keybind}
                    </kbd>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No mappings saved for this preset.</p>
      )}
    </section>
  );
}
