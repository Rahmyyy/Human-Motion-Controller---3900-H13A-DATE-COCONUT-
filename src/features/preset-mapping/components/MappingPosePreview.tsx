import { useMemo } from "react";
import type { PoseFrame } from "@/features/camera/poseFrame";
import PoseReplay from "@/features/movement-mapping/components/PoseReplay";

export default function MappingPosePreview({ poseFramesJson }: { poseFramesJson: string }) {
  const frames = useMemo(() => parsePoseFrames(poseFramesJson), [poseFramesJson]);

  if (frames.length === 0) {
    return (
      <div className="grid aspect-video w-full place-items-center border-b bg-muted/50">
        <p className="text-sm text-muted-foreground">Preview unavailable</p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden border-b bg-slate-950">
      <PoseReplay frames={frames} />
    </div>
  );
}

function parsePoseFrames(value: string): PoseFrame[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isPoseFrame);
  } catch {
    return [];
  }
}

function isPoseFrame(value: unknown): value is PoseFrame {
  if (!value || typeof value !== "object") return false;
  const frame = value as Partial<PoseFrame>;
  return (
    typeof frame.timestampMs === "number" &&
    Number.isFinite(frame.timestampMs) &&
    Array.isArray(frame.landmarks) &&
    frame.landmarks.every(isPoseLandmark)
  );
}

function isPoseLandmark(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const landmark = value as Record<string, unknown>;
  return ["index", "x", "y", "z", "visibility"].every((key) => typeof landmark[key] === "number");
}
