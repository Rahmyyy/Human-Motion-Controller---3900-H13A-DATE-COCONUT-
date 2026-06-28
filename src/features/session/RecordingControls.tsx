import { Button } from "@/components/ui/button";
import { Square, Circle } from "lucide-react";

interface RecordingControlsProps {
  isRecording: boolean;
  onToggle: () => void;
}

export default function RecordingControls({ isRecording, onToggle }: RecordingControlsProps) {
  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "default"}
      className="w-full"
      onClick={onToggle}
    >
      {isRecording ? (
        <>
          <Square className="size-4" aria-hidden="true" />
          Stop Recording
        </>
      ) : (
        <>
          <Circle className="size-4" aria-hidden="true" />
          Start Recording
        </>
      )}
    </Button>
  );
}
