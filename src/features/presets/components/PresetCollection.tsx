import PresetCard from "./PresetCard";
import type { Preset } from "../api/presetsApi";

type PresetCollectionProps = {
  onDuplicatePreset: (preset: Preset) => void;
  onSelectPreset: (presetId: string) => void;
  presets: Preset[];
  selectedPresetId: string | null;
};

export default function PresetCollection({
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
          onDuplicated={onDuplicatePreset}
          onSelect={() => onSelectPreset(preset.id)}
        />
      ))}
    </div>
  );
}
