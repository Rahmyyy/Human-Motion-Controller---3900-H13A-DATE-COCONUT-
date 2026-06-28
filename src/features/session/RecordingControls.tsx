import { Button } from "@/components/ui/button";
import { Circle, RotateCcw, Save, Square } from "lucide-react";
import type { RecordingState } from "./usePoseRecording";
import { useNavigate } from "react-router";

interface RecordingControlsProps {
  state: RecordingState;
  onReRecord: () => void;
  onSave: () => void;
  onStart: () => void;
  onStop: () => void;
}

export default function RecordingControls({
  state,
  onReRecord,
  onSave,
  onStart,
  onStop,
}: RecordingControlsProps) {
  const navigate = useNavigate();

  if (state === "recorded") {
    return (
      <div className="grid gap-2">
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            onSave();
            navigate(-1);
          }}
        >
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

  return (
    <Button type="button" className="w-full" onClick={onStart}>
      <Circle className="size-4" aria-hidden="true" />
      Start Recording
    </Button>
  );
}
