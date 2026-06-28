import MediaPipePosePreview from "@/features/camera/MediaPipePosePreview";
import type { PoseFrame } from "@/features/camera/poseFrame";
import PoseReplay from "./PoseReplay";
import type { RecordingState } from "../hooks/usePoseRecording";

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
  return (
    <section className="grid min-h-0 min-w-0" aria-label="Movement camera preview">
      {recordingState === "recorded" ? (
        <PoseReplay frames={frames} />
      ) : (
        <MediaPipePosePreview onPoseFrame={onPoseFrame} />
      )}
    </section>
  );
}
