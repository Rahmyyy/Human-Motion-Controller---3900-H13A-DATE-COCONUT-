import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { useEffect, useRef } from "react";
import type { PoseFrame, PoseLandmark } from "@/features/camera/poseFrame";

const MIN_VISIBILITY = 0.5;

interface PoseReplayProps {
  frames: PoseFrame[];
}

export default function PoseReplay({ frames }: PoseReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) {
      return;
    }

    const durationMs = frames[frames.length - 1].timestampMs - frames[0].timestampMs;

    if (durationMs <= 0) {
      drawFrame(canvas, frames[0]);
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

      drawFrame(canvas, frame);
      animationRef.current = requestAnimationFrame(replay);
    }

    animationRef.current = requestAnimationFrame(replay);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [frames]);

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

function drawFrame(canvas: HTMLCanvasElement, frame: PoseFrame) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const landmarks = new Map(frame.landmarks.map((landmark) => [landmark.index, landmark]));

  for (const connection of PoseLandmarker.POSE_CONNECTIONS) {
    const start = landmarks.get(connection.start);
    const end = landmarks.get(connection.end);

    if (!start || !end || !isVisible(start) || !isVisible(end)) {
      continue;
    }

    context.beginPath();
    context.moveTo(start.x * canvas.width, start.y * canvas.height);
    context.lineTo(end.x * canvas.width, end.y * canvas.height);
    context.lineWidth = 4;
    context.strokeStyle = "rgba(34, 197, 94, 0.9)";
    context.stroke();
  }

  for (const landmark of frame.landmarks) {
    if (!isVisible(landmark)) {
      continue;
    }

    context.beginPath();
    context.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, Math.PI * 2);
    context.fillStyle = "rgba(14, 165, 233, 0.95)";
    context.fill();
  }
}

function isVisible(landmark: PoseLandmark | undefined) {
  return Boolean(landmark && landmark.visibility >= MIN_VISIBILITY);
}
