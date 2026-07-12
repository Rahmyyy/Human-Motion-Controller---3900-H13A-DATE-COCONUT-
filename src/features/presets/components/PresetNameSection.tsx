import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

const MAX_PRESET_NAME_LENGTH = 60;

interface PresetNameSectionProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PresetNameSection({ value, onChange }: PresetNameSectionProps) {
  return (
    <section className="-mx-4 grid gap-3 border-t px-4 pt-4">
      <div className="grid gap-1">
        <label htmlFor="preset-name" className="font-medium">
          Name Your Preset
        </label>
        <p className="text-sm text-muted-foreground">
          Give your custom preset a name to help you identify it later.
        </p>
      </div>

      <Input
        id="preset-name"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={MAX_PRESET_NAME_LENGTH}
        autoFocus
        placeholder="e.g. Upper Limb Rehab - Mario Kart"
        aria-describedby="preset-name-help preset-name-count"
      />

      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <p id="preset-name-help" className="flex items-center gap-1.5">
          <Info className="size-3.5" aria-hidden="true" />
          You can always rename this later.
        </p>
        <span id="preset-name-count" aria-live="polite">
          {value.length} / {MAX_PRESET_NAME_LENGTH}
        </span>
      </div>
    </section>
  );
}
