import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FilesetResolver, type NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";
import { toPoseFrame, type PoseFrame } from "./poseFrame";
import styles from "./MediaPipePosePreview.module.css";

// Owns the browser camera + MediaPipe model lifecycle and emits PoseFrame data.
// Recording/replay/mapping state should stay outside this component.
const MEDIAPIPE_VERSION = "0.10.35";
const WASM_ASSET_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const POSE_MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const MIN_VISIBILITY = 0.5;

type PreviewStatus = "loading" | "running" | "error";

type MediaPipePosePreviewProps = {
  onPoseFrame?: (frame: PoseFrame) => void;
};

export default function MediaPipePosePreview({ onPoseFrame }: MediaPipePosePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const onPoseFrameRef = useRef(onPoseFrame);

  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    onPoseFrameRef.current = onPoseFrame;
  }, [onPoseFrame]);

  useEffect(() => {
    let cancelled = false;

    async function startPosePreview() {
      try {
        setStatus("loading");

        await invoke("stop_backend_camera").catch(() => undefined);

        const vision = await FilesetResolver.forVisionTasks(WASM_ASSET_PATH);
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: POSE_MODEL_PATH,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputSegmentationMasks: false,
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 960 },
            height: { ideal: 540 },
            facingMode: "user",
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          throw new Error("Video element is not available.");
        }

        video.srcObject = stream;
        await video.play();

        setStatus("running");
        frameRequestRef.current = requestAnimationFrame(renderFrame);
      } catch (startError) {
        console.error("MediaPipe preview failed:", startError);
        setError(startError instanceof Error ? startError.message : "MediaPipe preview failed.");
        setStatus("error");
      }
    }

    function renderFrame(now: number) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || !canvas || !landmarker) {
        frameRequestRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        frameRequestRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      syncCanvasToVideo(canvas, video);

      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;

        const result = landmarker.detectForVideo(video, now);
        const landmarks = result.landmarks[0] ?? [];
        const poseFrame = toPoseFrame(now, landmarks);
        onPoseFrameRef.current?.(poseFrame);

        drawPose(canvas, landmarks);
      }

      frameRequestRef.current = requestAnimationFrame(renderFrame);
    }

    startPosePreview();

    return () => {
      cancelled = true;

      if (frameRequestRef.current !== null) {
        cancelAnimationFrame(frameRequestRef.current);
      }

      landmarkerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <section className={styles.panel} aria-label="MediaPipe pose preview">
      <div className={styles.stage}>
        <video ref={videoRef} className={styles.video} playsInline muted aria-label="Camera feed" />
        <canvas ref={canvasRef} className={styles.overlay} />

        {status === "loading" && <p className={styles.message}>Loading pose model...</p>}
        {status === "error" && <p className={styles.error}>{error}</p>}
      </div>
    </section>
  );
}

function syncCanvasToVideo(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
  if (canvas.width !== video.videoWidth) {
    canvas.width = video.videoWidth;
  }

  if (canvas.height !== video.videoHeight) {
    canvas.height = video.videoHeight;
  }
}

function drawPose(canvas: HTMLCanvasElement, landmarks: NormalizedLandmark[]) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const connection of PoseLandmarker.POSE_CONNECTIONS) {
    const start = landmarks[connection.start];
    const end = landmarks[connection.end];

    if (!isVisible(start) || !isVisible(end)) {
      continue;
    }

    context.beginPath();
    context.moveTo(start.x * canvas.width, start.y * canvas.height);
    context.lineTo(end.x * canvas.width, end.y * canvas.height);
    context.lineWidth = 4;
    context.strokeStyle = "rgba(22, 163, 74, 0.9)";
    context.stroke();
  }

  for (const landmark of landmarks) {
    if (!isVisible(landmark)) {
      continue;
    }

    context.beginPath();
    context.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, Math.PI * 2);
    context.fillStyle = "rgba(14, 165, 233, 0.95)";
    context.fill();
  }
}

function isVisible(landmark: NormalizedLandmark | undefined) {
  return Boolean(landmark && landmark.visibility >= MIN_VISIBILITY);
}
