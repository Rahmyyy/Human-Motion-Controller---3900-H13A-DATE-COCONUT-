import type { PoseFrame } from "@/modules/pose-capture";
import PoseReplay from "@/components/pose-recording/PoseReplay";

interface MappingPosePreviewProps {
  frames: PoseFrame[];
  previewFrame?: PoseFrame | null;
}

export default function MappingPosePreview({
  frames,
  previewFrame = null,
}: MappingPosePreviewProps) {
  if (frames.length === 0) {
    return (
      <div className="grid aspect-video w-full place-items-center border-b bg-muted/50">
        <p className="text-sm text-muted-foreground">Preview unavailable</p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden border-b bg-slate-950">
      <PoseReplay frames={frames} previewFrame={previewFrame} />
    </div>
  );
}
