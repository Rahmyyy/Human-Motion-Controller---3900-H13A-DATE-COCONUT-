import { Button } from "@/components/ui/button";
import { Square, Circle } from "lucide-react";
import { useState } from "react";

export default function RecordingControls() {
  const [isRecording, setIsRecording] = useState(false);

  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "default"}
      className="w-full"
      onClick={() => setIsRecording((current) => !current)}
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
