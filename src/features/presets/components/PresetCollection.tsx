import PresetCard from "./PresetCard";
import type { Preset } from "../api/presetsApi";

type PresetCollectionProps = {
  onSelectPreset: (presetId: string) => void;
  presets: Preset[];
  selectedPresetId: string | null;
};

export default function PresetCollection({
  onSelectPreset,
  presets,
  selectedPresetId,
}: PresetCollectionProps) {
  if (presets.length === 0) {
    return (
      <p className="mt-5 rounded-lg border border-dashed bg-card/50 p-8 text-sm text-muted-foreground">
        No presets saved yet. Create one to get started.
      </p>
    );
  }

  return (
    <div className="mt-5 rounded-lg border border-dashed bg-card/50 p-8 text-sm text-muted-foreground">
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isSelected={selectedPresetId === preset.id}
            onSelect={() => onSelectPreset(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}
