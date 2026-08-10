import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { History, UserRound } from "lucide-react";
import { useNavigate } from "react-router";
import ExportPatientButton from "./ExportPatientButton";

interface PresetPageHeaderProps {
  patientName: string;
  patientId?: string;
}

export default function PresetPageHeader({ patientName, patientId }: PresetPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header>
      <BackButton to="/" />

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">
        Choose a preset
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Select a saved movement profile or create one to begin.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <UserRound className="size-4 text-primary" aria-hidden="true" />
          <span className="text-muted-foreground">Patient</span>
          <span className="font-medium text-foreground">{patientName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            disabled={!patientId}
            onClick={() => navigate(`/patients/${patientId}/history`, { state: { patientName } })}
          >
            <History className="size-4" aria-hidden="true" />
            Patient History
          </Button>
          <ExportPatientButton compact patientId={patientId} patientName={patientName} />
        </div>
      </div>
    </header>
  );
}
