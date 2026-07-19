import { useState } from "react";
import AnnotatedPreview from "@/features/camera/AnnotatedPreview";
import MediaPipePosePreview from "@/features/camera/MediaPipePosePreview";
import { getCameraMode } from "@/features/camera/cameraMode";
import type { PoseFrame } from "@/features/camera/poseFrame";
import PoseReplay from "./PoseReplay";
import RecordingCountdown from "./RecordingCountdown";
import type { RecordingState } from "../hooks/usePoseRecording";

// Shows live pose capture until recording stops, then swaps to replay.
interface MovementCameraPanelProps {
  countdownSeconds: number | null;
  frames: PoseFrame[];
  onPoseFrame: (frame: PoseFrame) => void;
  recordingState: RecordingState;
}

export default function MovementCameraPanel({
  countdownSeconds,
  frames,
  onPoseFrame,
  recordingState,
}: MovementCameraPanelProps) {
  const [cameraMode] = useState(() => getCameraMode());

  return (
    <section
      className="relative grid min-h-0 min-w-0 overflow-hidden rounded-xl"
      aria-label="Movement camera preview"
    >
      {recordingState === "recorded" ? (
        <PoseReplay frames={frames} />
      ) : cameraMode === "backend" ? (
        <AnnotatedPreview />
      ) : (
        <MediaPipePosePreview onPoseFrame={onPoseFrame} />
      )}
      {recordingState === "countdown" && (
        <RecordingCountdown secondsRemaining={countdownSeconds ?? 1} />
      )}
    </section>
  );
}
