import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { History, Info, UserRound } from "lucide-react";
import { useNavigate } from "react-router";
import CreatePresetDialog from "./CreatePresetDialog";
import type { Preset } from "@/modules/patient-presets";
import ExportPatientButton from "./ExportPatientButton";

interface PresetPageHeaderProps {
  createError: string | null;
  isCreating: boolean;
  onClearCreateError: () => void;
  onCreatePreset: (name: string) => Promise<Preset | null>;
  patientName: string;
  patientId?: string;
}

export default function PresetPageHeader({
  createError,
  isCreating,
  onClearCreateError,
  onCreatePreset,
  patientName,
  patientId,
}: PresetPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header>
      <BackButton to="/" />

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Choose a preset
            </h1>
            <div className="group relative">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-describedby="preset-page-help"
                aria-label="About preset selection"
              >
                <Info className="size-4" aria-hidden="true" />
              </Button>
              <div
                id="preset-page-help"
                role="tooltip"
                className="invisible absolute top-full left-0 z-20 mt-2 w-64 rounded-md border bg-popover p-3 text-sm text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
              >
                Select a saved movement profile or create one to test recognition.
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm">
            <UserRound className="size-4 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground">Patient</span>
            <span className="font-medium text-foreground">{patientName}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!patientId}
            onClick={() => navigate(`/patients/${patientId}/history`, { state: { patientName } })}
          >
            <History className="size-4" aria-hidden="true" />
            Patient History
          </Button>
          <CreatePresetDialog
            error={createError}
            isCreating={isCreating}
            onClearError={onClearCreateError}
            onCreate={onCreatePreset}
            patientId={patientId}
          />
          <ExportPatientButton patientId={patientId} patientName={patientName} />
        </div>
      </div>
    </header>
  );
}
