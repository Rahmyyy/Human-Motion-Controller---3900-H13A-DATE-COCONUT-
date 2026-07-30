import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Info, UserRound } from "lucide-react";
import CameraModeToggle from "./CameraModeToggle";
import CreatePresetDialog from "./CreatePresetDialog";
import type { Preset } from "../api/presetsApi";

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

        <div className="flex flex-wrap items-center gap-3">
          <CreatePresetDialog
            error={createError}
            isCreating={isCreating}
            onClearError={onClearCreateError}
            onCreate={onCreatePreset}
            patientId={patientId}
          />
          <BackButton to="/patients" />
          <CameraModeToggle />
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Choose a preset</h1>
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
    </header>
  );
}
