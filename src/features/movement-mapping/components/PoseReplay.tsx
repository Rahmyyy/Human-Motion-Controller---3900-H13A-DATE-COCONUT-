import { useEffect, useRef } from "react";
import { drawPoseFrame } from "@/features/camera/drawPoseFrame";
import type { PoseFrame } from "@/features/camera/poseFrame";

// Replays a recorded movement from PoseFrame landmarks only.
// No video is stored; the skeleton is redrawn on canvas from saved landmarks.
interface PoseReplayProps {
  frames: PoseFrame[];
  previewFrame?: PoseFrame | null;
}

export default function PoseReplay({ frames, previewFrame = null }: PoseReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) {
      return;
    }

    if (previewFrame) {
      drawPoseFrame(canvas, previewFrame);
      return;
    }

    const durationMs = frames[frames.length - 1].timestampMs - frames[0].timestampMs;

    if (durationMs <= 0) {
      drawPoseFrame(canvas, frames[0]);
      return;
    }

    startedAtRef.current = performance.now();

    function replay(now: number) {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const elapsedMs = (now - startedAtRef.current) % durationMs;
      const targetTimestamp = frames[0].timestampMs + elapsedMs;
      const frame = nearestFrame(frames, targetTimestamp);

      drawPoseFrame(canvas, frame);
      animationRef.current = requestAnimationFrame(replay);
    }

    animationRef.current = requestAnimationFrame(replay);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [frames, previewFrame]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={360}
      className="h-full min-h-0 w-full scale-x-[-1] rounded-xl bg-slate-950"
      aria-label="Recorded movement replay"
    />
  );
}

function nearestFrame(frames: PoseFrame[], timestampMs: number) {
  let nearest = frames[0];

  for (const frame of frames) {
    if (Math.abs(frame.timestampMs - timestampMs) < Math.abs(nearest.timestampMs - timestampMs)) {
      nearest = frame;
    }
  }

  return nearest;
}
