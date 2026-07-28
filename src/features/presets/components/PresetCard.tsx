import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Pencil, PersonStanding, Workflow } from "lucide-react";
import { Link } from "react-router";

import type { Preset } from "../api/presetsApi";
import DeletePresetDialog from "./DeletePresetDialog";
import DuplicatePresetDialog from "./DuplicatePresetDialog";

type PresetCardProps = {
  isSelected: boolean;
  deleteError: string | null;
  duplicateError: string | null;
  isDeleting: boolean;
  isDuplicating: boolean;
  onClearDeleteError: () => void;
  onClearDuplicateError: () => void;
  onDelete: (presetId: string) => Promise<boolean>;
  onDuplicate: (presetId: string) => Promise<Preset | null>;
  onSelect: () => void;
  preset: Preset;
};

export default function PresetCard({
  isSelected,
  deleteError,
  duplicateError,
  isDeleting,
  isDuplicating,
  onClearDeleteError,
  onClearDuplicateError,
  onDelete,
  onDuplicate,
  onSelect,
  preset,
}: PresetCardProps) {
  return (
    <article
      className={cn(
        "flex min-h-72 flex-col overflow-hidden rounded-lg border bg-card",
        isSelected && "border-primary ring-1 ring-primary",
      )}
    >
      <div className="flex h-28 items-center justify-center border-b bg-muted/60">
        <PersonStanding className="size-12 stroke-1 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-foreground">{preset.name}</h3>
        <div className="mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Workflow className="size-4" aria-hidden="true" />
            {preset.mappingCount} {preset.mappingCount === 1 ? "mapping" : "mappings"}
          </span>
        </div>

        <div className="mt-6 flex items-center gap-1 border-t pt-4">
          <DuplicatePresetDialog
            error={duplicateError}
            isDuplicating={isDuplicating}
            onClearError={onClearDuplicateError}
            onDuplicate={onDuplicate}
            preset={preset}
          />
          <Button asChild variant="ghost" size="icon" title={`Edit ${preset.name} mappings`}>
            <Link to={`/patients/${preset.patientId}/presets/${preset.id}/edit`}>
              <Pencil className="size-4" aria-hidden="true" />
              <span className="sr-only">Edit {preset.name} mappings</span>
            </Link>
          </Button>
          <DeletePresetDialog
            error={deleteError}
            isDeleting={isDeleting}
            onClearError={onClearDeleteError}
            onDelete={onDelete}
            preset={preset}
          />
          <Button
            type="button"
            variant={isSelected ? "default" : "secondary"}
            className="ml-auto"
            onClick={onSelect}
            aria-label={`${isSelected ? "Unselect" : "Select"} ${preset.name}`}
            aria-pressed={isSelected}
          >
            {isSelected && <Check className="size-4" aria-hidden="true" />}
            {isSelected ? "Selected" : "Select"}
          </Button>
        </div>
      </div>
    </article>
  );
}
