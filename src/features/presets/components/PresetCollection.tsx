import PresetCard from "./PresetCard";
import type { Preset, PresetMutationError } from "@/modules/patient-presets";

type PresetCollectionProps = {
  deleteError: PresetMutationError | null;
  deletingPresetId: string | null;
  duplicateError: PresetMutationError | null;
  duplicatingPresetId: string | null;
  onClearDeleteError: () => void;
  onClearDuplicateError: () => void;
  onDeletePreset: (presetId: string) => Promise<boolean>;
  onDuplicatePreset: (presetId: string) => Promise<Preset | null>;
  onSelectPreset: (presetId: string) => void;
  presets: Preset[];
  selectedPresetId: string | null;
};

export default function PresetCollection({
  deleteError,
  deletingPresetId,
  duplicateError,
  duplicatingPresetId,
  onClearDeleteError,
  onClearDuplicateError,
  onDeletePreset,
  onDuplicatePreset,
  onSelectPreset,
  presets,
  selectedPresetId,
}: PresetCollectionProps) {
  if (presets.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
        No presets saved yet. Create one to get started.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {presets.map((preset) => (
        <PresetCard
          key={preset.id}
          preset={preset}
          isSelected={selectedPresetId === preset.id}
          deleteError={deleteError?.presetId === preset.id ? deleteError.message : null}
          duplicateError={duplicateError?.presetId === preset.id ? duplicateError.message : null}
          isDeleting={deletingPresetId === preset.id}
          isDuplicating={duplicatingPresetId === preset.id}
          onClearDeleteError={onClearDeleteError}
          onClearDuplicateError={onClearDuplicateError}
          onDelete={onDeletePreset}
          onDuplicate={onDuplicatePreset}
          onSelect={() => onSelectPreset(preset.id)}
        />
      ))}
    </div>
  );
}
