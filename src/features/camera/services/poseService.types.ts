import type { PoseFrame } from "@/modules/pose-capture";

export type PoseServiceStatus = "idle" | "loading" | "running" | "error";

export interface PoseServiceSnapshot {
  status: PoseServiceStatus;
  error: string | null;
}

/**
 * Owns the frontend MediaPipe model, webcam lifecycle, frame scheduling,
 * resource cleanup, status updates, and pose-frame publication.
 */
export interface PoseService {
  getSnapshot(): PoseServiceSnapshot;
  subscribeStatus(listener: () => void): () => void;
  subscribeFrames(listener: (frame: PoseFrame) => void): () => void;
  start(video: HTMLVideoElement): Promise<void>;
  stop(video?: HTMLVideoElement): void;
  dispose(): void;
}
