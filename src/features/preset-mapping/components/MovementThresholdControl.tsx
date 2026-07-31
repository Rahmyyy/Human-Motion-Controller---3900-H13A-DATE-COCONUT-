import { Slider } from "radix-ui";
import type { ThresholdSaveState } from "../services/presetMappingsService.types";

interface MovementThresholdControlProps {
  minimum: number;
  movementName: string;
  onValueChange: (percentage: number) => void;
  onValueCommit: (percentage: number) => void;
  saveState: ThresholdSaveState;
  value: number;
}

export default function MovementThresholdControl({
  minimum,
  movementName,
  onValueChange,
  onValueCommit,
  saveState,
  value,
}: MovementThresholdControlProps) {
  return (
    <section
      className="mt-4 border-t border-border/70 pt-4"
      aria-label={`${movementName} movement threshold`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Movement threshold
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}%</p>
        </div>
        <ThresholdSaveFeedback state={saveState} />
      </div>

      <Slider.Root
        className="relative mt-3 flex h-6 w-full touch-none select-none items-center"
        min={minimum}
        max={100}
        step={1}
        value={[value]}
        disabled={minimum === 100}
        onValueChange={([percentage]) => {
          if (percentage !== undefined) onValueChange(percentage);
        }}
        onValueCommit={([percentage]) => {
          if (percentage !== undefined) onValueCommit(percentage);
        }}
      >
        <Slider.Track className="relative h-2 grow overflow-hidden rounded-full bg-muted">
          <Slider.Range className="absolute h-full bg-primary" />
        </Slider.Track>
        <Slider.Thumb
          className="block size-5 rounded-full border-2 border-primary bg-background shadow-sm outline-none transition-shadow hover:ring-2 hover:ring-primary/20 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`${movementName} completion threshold`}
        />
      </Slider.Root>

      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>Safe minimum {minimum}%</span>
        <span>Full movement 100%</span>
      </div>
    </section>
  );
}

function ThresholdSaveFeedback({ state }: { state: ThresholdSaveState }) {
  if (state === "saving") {
    return <span className="text-xs text-muted-foreground">Saving…</span>;
  }
  if (state === "saved") {
    return <span className="text-xs font-medium text-emerald-700">Saved</span>;
  }
  if (state === "error") {
    return <span className="text-xs font-medium text-destructive">Save failed</span>;
  }
  return null;
}
