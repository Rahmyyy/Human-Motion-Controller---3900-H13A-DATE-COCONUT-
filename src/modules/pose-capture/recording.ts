import type { PoseFrame } from "./domain";

export type RecordingState = "idle" | "countdown" | "recording" | "recorded";

export type RecordingTrimRange = {
  durationMs: number;
  startMs: number;
  endMs: number;
};

export interface PoseFrameSource {
  subscribeFrames(listener: (frame: PoseFrame) => void): () => void;
}

export interface RecordingSnapshot {
  countdownSeconds: number | null;
  isRecording: boolean;
  recordedFrames: PoseFrame[];
  recordingTrim: RecordingTrimRange | null;
  recordingState: RecordingState;
}

/** Owns countdown, frame buffering, trimming, reset, and cleanup for one pose recording. */
export interface PoseRecording {
  getSnapshot(): RecordingSnapshot;
  subscribe(listener: () => void): () => void;
  start(): void;
  stop(): void;
  startRecording(): void;
  cancelCountdown(): void;
  stopRecording(): PoseFrame[];
  resetRecording(): void;
  trimRecording(range: RecordingTrimRange): void;
}

type RecordingClock = {
  now(): number;
  setInterval(callback: () => void, intervalMs: number): ReturnType<typeof setInterval>;
  clearInterval(timer: ReturnType<typeof setInterval>): void;
};

const COUNTDOWN_SECONDS = 3;

class PoseRecordingWorkspace implements PoseRecording {
  private snapshot: RecordingSnapshot;
  private frames: PoseFrame[];
  private readonly listeners = new Set<() => void>();
  private unsubscribeFrames: (() => void) | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly frameSource: PoseFrameSource,
    private readonly clock: RecordingClock,
    initialFrames: PoseFrame[],
    initialState: RecordingState,
  ) {
    this.frames = [...initialFrames];
    this.snapshot = {
      countdownSeconds: null,
      isRecording: initialState === "recording",
      recordedFrames: [...initialFrames],
      recordingTrim: createRecordingTrimRange(initialFrames),
      recordingState: initialState,
    };
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = () => {
    if (!this.unsubscribeFrames) {
      this.unsubscribeFrames = this.frameSource.subscribeFrames(this.recordFrame);
    }
  };

  stop = () => {
    this.unsubscribeFrames?.();
    this.unsubscribeFrames = null;
    this.clearCountdown();
  };

  startRecording = () => {
    this.clearCountdown();
    const startedAt = this.clock.now();
    this.publish({
      countdownSeconds: COUNTDOWN_SECONDS,
      isRecording: false,
      recordingState: "countdown",
    });
    this.countdownTimer = this.clock.setInterval(() => {
      const elapsedSeconds = (this.clock.now() - startedAt) / 1000;
      const remainingSeconds = Math.ceil(COUNTDOWN_SECONDS - elapsedSeconds);
      if (remainingSeconds > 0) {
        if (remainingSeconds !== this.snapshot.countdownSeconds) {
          this.publish({ countdownSeconds: remainingSeconds });
        }
        return;
      }

      this.clearCountdown();
      this.frames = [];
      this.publish({
        countdownSeconds: null,
        isRecording: true,
        recordedFrames: [],
        recordingTrim: null,
        recordingState: "recording",
      });
    }, 50);
  };

  cancelCountdown = () => {
    this.clearCountdown();
    this.publish({
      countdownSeconds: null,
      isRecording: false,
      recordingState: "idle",
    });
  };

  stopRecording = () => {
    const recordedFrames = [...this.frames];
    this.publish({
      isRecording: false,
      recordedFrames,
      recordingTrim: createRecordingTrimRange(recordedFrames),
      recordingState: "recorded",
    });
    return recordedFrames;
  };

  resetRecording = () => {
    this.clearCountdown();
    this.frames = [];
    this.publish({
      countdownSeconds: null,
      isRecording: false,
      recordedFrames: [],
      recordingTrim: null,
      recordingState: "idle",
    });
  };

  trimRecording = (range: RecordingTrimRange) => {
    const fullRange = createRecordingTrimRange(this.frames);
    if (!fullRange) return;
    const recordingTrim = constrainRecordingTrimRange(range, fullRange.durationMs);
    this.publish({
      recordedFrames: trimRecordingFrames(this.frames, recordingTrim),
      recordingTrim,
    });
  };

  private recordFrame = (frame: PoseFrame) => {
    if (this.snapshot.isRecording) this.frames.push(frame);
  };

  private clearCountdown() {
    if (this.countdownTimer !== null) this.clock.clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }

  private publish(update: Partial<RecordingSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.listeners.forEach((listener) => listener());
  }
}

export function createPoseRecording(
  frameSource: PoseFrameSource,
  initialFrames: PoseFrame[] = [],
  initialState: RecordingState = "idle",
): PoseRecording {
  return new PoseRecordingWorkspace(frameSource, browserClock, initialFrames, initialState);
}

const browserClock: RecordingClock = {
  now: () => performance.now(),
  setInterval: (callback, intervalMs) => globalThis.setInterval(callback, intervalMs),
  clearInterval: (timer) => globalThis.clearInterval(timer),
};

export function createRecordingTrimRange(frames: PoseFrame[]): RecordingTrimRange | null {
  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];
  if (!firstFrame || !lastFrame) return null;

  const durationMs = Math.max(0, lastFrame.timestampMs - firstFrame.timestampMs);
  return durationMs === 0 ? null : { durationMs, startMs: 0, endMs: durationMs };
}

export function constrainRecordingTrimRange(
  range: RecordingTrimRange,
  durationMs: number,
): RecordingTrimRange {
  const constrainedDurationMs = Math.max(0, durationMs);
  const startMs = clamp(range.startMs, 0, constrainedDurationMs);
  return {
    durationMs: constrainedDurationMs,
    startMs,
    endMs: clamp(range.endMs, startMs, constrainedDurationMs),
  };
}

export function trimRecordingFrames(frames: PoseFrame[], range: RecordingTrimRange) {
  const firstFrame = frames[0];
  if (!firstFrame) return [];

  return frames.filter((frame) => {
    const offsetMs = frame.timestampMs - firstFrame.timestampMs;
    return offsetMs >= range.startMs && offsetMs <= range.endMs;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
