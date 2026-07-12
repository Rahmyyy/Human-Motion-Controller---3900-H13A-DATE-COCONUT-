import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export type PresetStartMode = "template" | "custom";

interface PresetStartModeSelectorProps {
  selectedMode: PresetStartMode | null;
  onSelectMode: (mode: PresetStartMode) => void;
}

const modes: Array<{
  description: string;
  label: string;
  value: PresetStartMode;
}> = [
  {
    value: "template",
    label: "Use Existing Template",
    description: "Start from a predefined movement mapping.",
  },
  {
    value: "custom",
    label: "Create Custom Preset",
    description: "Start from scratch with a blank configuration.",
  },
];

export default function PresetStartModeSelector({
  selectedMode,
  onSelectMode,
}: PresetStartModeSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {modes.map((mode) => {
        const isSelected = selectedMode === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectMode(mode.value)}
            className={cn(
              "rounded-lg border p-4 text-left hover:bg-muted/50",
              isSelected && "border-primary bg-primary/5 ring-1 ring-primary",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{mode.label}</span>
              {isSelected && <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{mode.description}</p>
          </button>
        );
      })}
    </div>
  );
}
