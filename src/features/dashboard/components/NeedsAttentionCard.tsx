import { AlertTriangle, ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Patient } from "@/modules/patient-presets";
import { getNeedsAttentionPatients } from "../patientSummary";

interface NeedsAttentionCardProps {
  error: string | null;
  isLoading: boolean;
  onSelectPatient(patient: Patient): void;
  patients: Patient[];
}

const activityFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function NeedsAttentionCard({
  error,
  isLoading,
  onSelectPatient,
  patients,
}: NeedsAttentionCardProps) {
  const needsAttention = getNeedsAttentionPatients(patients);

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600" aria-hidden="true" />
          Needs Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3">
        {isLoading ? (
          <p className="px-1 py-3 text-sm text-muted-foreground">Loading patients...</p>
        ) : error ? (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        ) : needsAttention.length === 0 ? (
          <p className="px-1 py-3 text-sm text-muted-foreground">No patients need attention.</p>
        ) : (
          needsAttention.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => onSelectPatient(patient)}
              className="flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-left transition hover:bg-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-amber-900 dark:bg-amber-950/20 dark:hover:bg-amber-950/35"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-semibold text-white">
                !
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{patient.displayName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  Patient needs review
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {activityFormatter.format(patient.lastActivityAtMs)}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
