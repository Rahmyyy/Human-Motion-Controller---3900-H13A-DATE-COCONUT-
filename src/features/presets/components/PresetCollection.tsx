import PresetCard from "./PresetCard";

type Preset = {
  id: string;
  name: string;
  description: string;
  mappingCount: number;
};

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
