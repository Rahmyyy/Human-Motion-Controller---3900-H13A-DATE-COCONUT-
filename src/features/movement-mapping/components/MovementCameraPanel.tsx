import { useState } from "react";
import AnnotatedPreview from "@/features/camera/AnnotatedPreview";
import MediaPipePosePreview from "@/features/camera/MediaPipePosePreview";
import { getCameraMode } from "@/features/camera/cameraMode";
import type { PoseFrame } from "@/features/camera/poseFrame";
import PoseReplay from "./PoseReplay";
import type { RecordingState } from "../hooks/usePoseRecording";

// Shows live pose capture until recording stops, then swaps to replay.
interface MovementCameraPanelProps {
  frames: PoseFrame[];
  onPoseFrame: (frame: PoseFrame) => void;
  recordingState: RecordingState;
}

export default function MovementCameraPanel({
  frames,
  onPoseFrame,
  recordingState,
}: MovementCameraPanelProps) {
  const [cameraMode] = useState(() => getCameraMode());

  return (
    <section className="grid min-h-0 min-w-0" aria-label="Movement camera preview">
      {recordingState === "recorded" ? (
        <PoseReplay frames={frames} />
      ) : cameraMode === "backend" ? (
        <AnnotatedPreview />
      ) : (
        <MediaPipePosePreview onPoseFrame={onPoseFrame} />
      )}
    </section>
  );
}
