import { Button } from "@/components/ui/button";
import { Circle, RotateCcw, Save, Square, X } from "lucide-react";
import type { RecordingState } from "../hooks/usePoseRecording";

interface RecordingControlsProps {
  state: RecordingState;
  canSave: boolean;
  onCancel: () => void;
  onReRecord: () => void;
  onSave: () => void;
  onStart: () => void;
  onStop: () => void;
}

export default function RecordingControls({
  state,
  canSave,
  onCancel,
  onReRecord,
  onSave,
  onStart,
  onStop,
}: RecordingControlsProps) {
  if (state === "recorded") {
    return (
      <div className="grid gap-2">
        <Button type="button" className="w-full" disabled={!canSave} onClick={onSave}>
          <Save className="size-4" aria-hidden="true" />
          Save Mapping
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={onReRecord}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Re-record
        </Button>
      </div>
    );
  }

  if (state === "recording") {
    return (
      <Button type="button" variant="destructive" className="w-full" onClick={onStop}>
        <Square className="size-4" aria-hidden="true" />
        Stop Recording
      </Button>
    );
  }

  if (state === "countdown") {
    return (
      <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
        <X className="size-4" aria-hidden="true" />
        Cancel Countdown
      </Button>
    );
  }

  return (
    <Button type="button" className="w-full" onClick={onStart}>
      <Circle className="size-4" aria-hidden="true" />
      Start Recording
    </Button>
  );
}
