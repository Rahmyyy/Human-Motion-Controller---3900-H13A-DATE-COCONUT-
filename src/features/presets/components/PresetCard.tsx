import { cn } from "@/lib/utils";

import type { Preset } from "../api/presetsApi";

type PresetCardProps = {
  isSelected: boolean;
  onSelect: () => void;
  preset: Preset;
};

export default function PresetCard({ isSelected, onSelect, preset }: PresetCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-lg border bg-card p-5 text-left shadow-sm transition hover:bg-muted/50",
        isSelected && "border-primary ring-2 ring-primary/25",
      )}
    >
      <h3 className="text-lg font-semibold">{preset.name}</h3>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        {preset.mappingCount} mappings
      </p>

      {isSelected && <p className="mt-4 text-sm font-medium text-primary">Selected</p>}
    </button>
  );
}
