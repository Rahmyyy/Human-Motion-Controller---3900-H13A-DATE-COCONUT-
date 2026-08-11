import type { NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";
import { vi } from "vitest";

/**
 * Doubles for the browser pieces the pose service owns. jsdom has no camera, no media playback and
 * no rendering loop, so each one is replaced with something the tests can drive step by step.
 */
export function fakeStream() {
  const track = { stop: vi.fn() };
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track };
}

export function fakeVideo(size = { width: 640, height: 480 }) {
  const video = document.createElement("video");
  let currentTime = 0;

  Object.defineProperty(video, "videoWidth", { configurable: true, value: size.width });
  Object.defineProperty(video, "videoHeight", { configurable: true, value: size.height });
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTime,
    set: (next: number) => {
      currentTime = next;
    },
  });
  video.play = vi.fn(() => Promise.resolve());

  return video;
}

export function fakeModel(landmarks: NormalizedLandmark[][] = [[]]) {
  const model = {
    close: vi.fn(),
    detectForVideo: vi.fn(() => ({ landmarks })),
  };
  return model as unknown as PoseLandmarker & typeof model;
}

export function landmark(overrides: Partial<NormalizedLandmark> = {}): NormalizedLandmark {
  return { x: 0.1, y: 0.2, z: 0.3, visibility: 0.9, ...overrides };
}

/** jsdom's navigator has no mediaDevices at all, so the whole namespace is installed here. */
export function stubCamera(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
}

/** Replaces the frame scheduler so tests advance the render loop one frame at a time. */
export function stubAnimationFrames() {
  const pending: FrameRequestCallback[] = [];
  const cancelled: number[] = [];

  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pending.push(callback);
    return pending.length;
  });
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
    cancelled.push(handle);
  });

  return {
    cancelled,
    get pendingCount() {
      return pending.length;
    },
    step(now = 0) {
      pending.shift()?.(now);
    },
  };
}

/** A promise the test resolves or rejects itself, to hold the service mid-start. */
export function deferred<T>() {
  let settle!: { resolve: (value: T) => void; reject: (reason: unknown) => void };
  const promise = new Promise<T>((resolve, reject) => {
    settle = { resolve, reject };
  });
  return { promise, ...settle };
}
