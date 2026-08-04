import type { NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseFrame } from "@/modules/pose-capture";
import { loadPoseModel } from "./loadPoseModel";
import type { PoseService, PoseServiceSnapshot, PoseServiceStatus } from "./poseService.types";

type Listener = () => void;
type FrameListener = (frame: PoseFrame) => void;

class MediaPipePoseService implements PoseService {
  private snapshot: PoseServiceSnapshot = { status: "idle", error: null };
  private readonly statusListeners = new Set<Listener>();
  private readonly frameListeners = new Set<FrameListener>();
  private model: PoseLandmarker | null = null;
  private modelPromise: Promise<PoseLandmarker> | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private requestedVideo: HTMLVideoElement | null = null;
  private frameRequest: number | null = null;
  private lastVideoTime = -1;
  private startToken = 0;

  getSnapshot = () => this.snapshot;

  subscribeStatus = (listener: Listener) => {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  };

  subscribeFrames = (listener: FrameListener) => {
    this.frameListeners.add(listener);
    return () => {
      this.frameListeners.delete(listener);
    };
  };

  async start(video: HTMLVideoElement) {
    const token = ++this.startToken;
    this.releaseCamera();
    this.requestedVideo = video;
    this.publishStatus("loading", null);

    try {
      await this.getModel();
      if (token !== this.startToken) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: "user" },
        audio: false,
      });
      if (token !== this.startToken) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      this.stream = stream;
      this.video = video;
      video.srcObject = stream;
      await video.play();
      if (token !== this.startToken) return;

      this.lastVideoTime = -1;
      this.publishStatus("running", null);
      this.frameRequest = requestAnimationFrame(this.renderFrame);
    } catch (error) {
      if (token !== this.startToken) return;
      this.releaseCamera();
      this.publishStatus("error", errorMessage(error));
    }
  }

  stop(video?: HTMLVideoElement) {
    if (video && this.requestedVideo !== video) return;
    this.startToken += 1;
    this.releaseCamera();
    this.requestedVideo = null;
    this.publishStatus("idle", null);
  }

  dispose() {
    this.stop();
    this.model?.close();
    this.model = null;
    this.modelPromise = null;
    this.frameListeners.clear();
    this.statusListeners.clear();
  }

  private getModel() {
    if (this.model) return Promise.resolve(this.model);
    if (!this.modelPromise) {
      this.modelPromise = loadPoseModel()
        .then((model) => {
          this.model = model;
          return model;
        })
        .catch((error) => {
          this.modelPromise = null;
          throw error;
        });
    }
    return this.modelPromise;
  }

  private renderFrame = (now: number) => {
    const video = this.video;
    if (!video || !this.model) return;

    try {
      if (
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        video.currentTime !== this.lastVideoTime
      ) {
        this.lastVideoTime = video.currentTime;
        const result = this.model.detectForVideo(video, now);
        const frame = toPoseFrame(now, result.landmarks[0] ?? []);
        this.frameListeners.forEach((listener) => listener(frame));
      }
      this.frameRequest = requestAnimationFrame(this.renderFrame);
    } catch (error) {
      this.releaseCamera();
      this.publishStatus("error", errorMessage(error));
    }
  };

  private releaseCamera() {
    if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
  }

  private publishStatus(status: PoseServiceStatus, error: string | null) {
    if (this.snapshot.status === status && this.snapshot.error === error) return;
    this.snapshot = { status, error };
    this.statusListeners.forEach((listener) => listener());
  }
}

function errorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Camera permission was denied. Allow camera access and try again.";
  }
  if (error instanceof Error) return error.message;
  return "Unable to start pose detection.";
}

/** MediaPipe transport conversion stays in this real external adapter. */
function toPoseFrame(timestampMs: number, landmarks: NormalizedLandmark[]): PoseFrame {
  return {
    timestampMs,
    landmarks: landmarks.map((landmark, index) => ({
      index,
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
      visibility: landmark.visibility,
    })),
  };
}

export const poseService: PoseService = new MediaPipePoseService();

export type { PoseService, PoseServiceSnapshot, PoseServiceStatus } from "./poseService.types";
