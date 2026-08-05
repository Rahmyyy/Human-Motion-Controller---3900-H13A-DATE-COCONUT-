import { UserRound } from "lucide-react";
import BackButton from "@/components/BackButton";

interface PatientHistoryHeaderProps {
  patientId: string | undefined;
  patientName: string;
}

export default function PatientHistoryHeader({
  patientId,
  patientName,
}: PatientHistoryHeaderProps) {
  return (
    <header>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex items-center gap-3 self-start rounded-lg border bg-card px-4 py-3">
          <UserRound className="size-6 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm text-muted-foreground">Patient</p>
            <p className="font-semibold text-foreground">{patientName}</p>
          </div>
        </div>

        <BackButton
          label="Back to presets"
          state={{ patientName }}
          to={`/patients/${patientId}/presets`}
        />
      </div>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">
        Patient history
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Review completed sessions and movement activity over time.
      </p>
    </header>
  );
}
