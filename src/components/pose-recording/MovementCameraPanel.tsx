import MediaPipePosePreview from "@/features/camera/MediaPipePosePreview";
import type { PoseFrame, RecordingState } from "@/modules/pose-capture";
import PoseReplay from "./PoseReplay";
import RecordingCountdown from "./RecordingCountdown";

// Shows live pose capture until recording stops, then swaps to replay.
interface MovementCameraPanelProps {
  countdownSeconds: number | null;
  frames: PoseFrame[];
  recordingState: RecordingState;
}

export default function MovementCameraPanel({
  countdownSeconds,
  frames,
  recordingState,
}: MovementCameraPanelProps) {
  return (
    <section
      className="relative grid min-h-0 min-w-0 overflow-hidden rounded-xl"
      aria-label="Movement camera preview"
    >
      {recordingState === "recorded" ? <PoseReplay frames={frames} /> : <MediaPipePosePreview />}
      {recordingState === "countdown" && (
        <RecordingCountdown secondsRemaining={countdownSeconds ?? 1} />
      )}
    </section>
  );
}
