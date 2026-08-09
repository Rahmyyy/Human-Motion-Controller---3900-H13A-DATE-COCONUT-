import { RotateCcw, Scissors } from "lucide-react";
import { Slider } from "radix-ui";
import { Button } from "@/components/ui/button";
import type { RecordingTrimRange } from "@/modules/pose-capture";

interface RecordingTrimPanelProps {
  trim: RecordingTrimRange;
  onChange: (trim: RecordingTrimRange) => void;
}

export default function RecordingTrimPanel({ trim, onChange }: RecordingTrimPanelProps) {
  const isTrimmed = trim.startMs > 0 || trim.endMs < trim.durationMs;

  const updateRange = ([startMs, endMs]: number[]) => {
    if (startMs === undefined || endMs === undefined) return;
    onChange({ ...trim, startMs, endMs });
  };

  const restoreFullRecording = () => {
    onChange({ ...trim, startMs: 0, endMs: trim.durationMs });
  };

  return (
    <section className="rounded-lg border bg-card p-4" aria-label="Crop recording">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Scissors className="size-4" aria-hidden="true" />
            Crop recording
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Remove idle frames before or after the movement.
          </p>
        </div>
        {isTrimmed && (
          <Button type="button" size="sm" variant="ghost" onClick={restoreFullRecording}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Restore
          </Button>
        )}
      </div>

      <Slider.Root
        className="relative mt-5 flex h-5 w-full touch-none select-none items-center"
        min={0}
        max={trim.durationMs}
        step={1}
        minStepsBetweenThumbs={1}
        value={[trim.startMs, trim.endMs]}
        onValueChange={updateRange}
      >
        <Slider.Track className="relative h-2 grow overflow-hidden rounded-full bg-muted">
          <Slider.Range className="absolute h-full bg-primary" />
        </Slider.Track>
        <Slider.Thumb
          className="block size-5 rounded-full border-2 border-primary bg-background shadow-sm outline-none transition-shadow hover:ring-2 hover:ring-primary/20 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Recording start time"
        />
        <Slider.Thumb
          className="block size-5 rounded-full border-2 border-primary bg-background shadow-sm outline-none transition-shadow hover:ring-2 hover:ring-primary/20 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Recording end time"
        />
      </Slider.Root>

      <div className="mt-1 flex justify-between text-xs font-medium">
        <span>Start: {formatDuration(trim.startMs)}</span>
        <span>End: {formatDuration(trim.endMs)}</span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Selected: {formatDuration(trim.endMs - trim.startMs)} of {formatDuration(trim.durationMs)}
      </p>
    </section>
  );
}

function formatDuration(durationMs: number) {
  return `${(durationMs / 1000).toFixed(1)}s`;
}
