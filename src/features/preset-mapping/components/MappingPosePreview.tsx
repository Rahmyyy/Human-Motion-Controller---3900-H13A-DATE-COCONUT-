import type { PoseFrame } from "@/features/camera/poseFrame";
import PoseReplay from "@/features/movement-mapping/components/PoseReplay";

export default function MappingPosePreview({ frames }: { frames: PoseFrame[] }) {
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
