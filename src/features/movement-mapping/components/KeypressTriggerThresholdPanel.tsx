import { ChevronDown, Gauge } from "lucide-react";
import { Slider } from "radix-ui";
import {
  MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE,
  MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE,
} from "@/features/movement-recognition/recognition/recognitionConfig";

interface KeypressTriggerThresholdPanelProps {
  onChange: (percentage: number) => void;
  value: number;
}

export default function KeypressTriggerThresholdPanel({
  onChange,
  value,
}: KeypressTriggerThresholdPanelProps) {
  return (
    <section className="rounded-lg border bg-background shadow-sm">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
          <Gauge className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 flex items-center gap-2 text-base font-semibold text-foreground">
              Keypress Trigger Threshold
              <span className="rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Optional
              </span>
            </h2>
            <p className="m-0 text-xs text-muted-foreground">{value}% match confidence</p>
          </div>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="grid gap-3 px-5 pb-5">
          <p className="m-0 text-sm text-muted-foreground">
            Set the match confidence required before this movement sends its keypress.
          </p>

          <output className="text-lg font-semibold tabular-nums text-foreground" aria-live="polite">
            {value}%
          </output>

          <Slider.Root
            className="relative flex h-6 w-full touch-none select-none items-center"
            min={MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE}
            max={MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE}
            step={1}
            value={[value]}
            onValueChange={([percentage]) => {
              if (percentage !== undefined) onChange(percentage);
            }}
          >
            <Slider.Track className="relative h-2 grow overflow-hidden rounded-full bg-muted">
              <Slider.Range className="absolute h-full bg-primary" />
            </Slider.Track>
            <Slider.Thumb
              className="block size-5 rounded-full border-2 border-primary bg-background shadow-sm outline-none transition-shadow hover:ring-2 hover:ring-primary/20 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Keypress trigger threshold percentage"
            />
          </Slider.Root>

          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE}%</span>
            <span>{MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE}%</span>
          </div>
        </div>
      </details>
    </section>
  );
}
