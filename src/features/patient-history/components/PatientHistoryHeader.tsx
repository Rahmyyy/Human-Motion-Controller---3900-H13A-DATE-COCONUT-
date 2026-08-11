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
      <BackButton
        label="Back to presets"
        state={{ patientName }}
        to={`/patients/${patientId}/presets`}
      />

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">
        Patient history
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Review completed sessions and movement activity over time.
      </p>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <UserRound className="size-4 text-primary" aria-hidden="true" />
        <span className="text-muted-foreground">Patient</span>
        <span className="font-medium text-foreground">{patientName}</span>
      </div>
    </header>
  );
}
