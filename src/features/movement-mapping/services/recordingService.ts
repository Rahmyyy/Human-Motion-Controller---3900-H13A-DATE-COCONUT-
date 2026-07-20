import { poseService } from "@/features/camera/services/poseService";
import type { PoseFrame } from "@/features/camera/poseFrame";
import {
  constrainRecordingTrimRange,
  createRecordingTrimRange,
  trimRecordingFrames,
  type RecordingTrimRange,
} from "../recording/trimRecording";
import type { RecordingService, RecordingSnapshot, RecordingState } from "./recordingService.types";

type Listener = () => void;
const COUNTDOWN_SECONDS = 3;

class PoseRecordingService implements RecordingService {
  private snapshot: RecordingSnapshot;
  private frames: PoseFrame[];
  private readonly listeners = new Set<Listener>();
  private unsubscribeFrames: (() => void) | null = null;
  private countdownTimer: number | null = null;

  constructor(initialFrames: PoseFrame[], initialState: RecordingState) {
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

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = () => {
    if (!this.unsubscribeFrames) {
      this.unsubscribeFrames = poseService.subscribeFrames(this.recordFrame);
    }
  };

  stop = () => {
    this.unsubscribeFrames?.();
    this.unsubscribeFrames = null;
    this.clearCountdown();
  };

  startRecording = () => {
    this.clearCountdown();
    const startedAt = performance.now();
    this.publish({
      countdownSeconds: COUNTDOWN_SECONDS,
      isRecording: false,
      recordingState: "countdown",
    });
    this.countdownTimer = window.setInterval(() => {
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
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
    if (this.countdownTimer !== null) window.clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }

  private publish(update: Partial<RecordingSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.listeners.forEach((listener) => listener());
  }
}

export function createRecordingService(
  initialFrames: PoseFrame[] = [],
  initialState: RecordingState = "idle",
): RecordingService {
  return new PoseRecordingService(initialFrames, initialState);
}

export type { RecordingService, RecordingSnapshot, RecordingState } from "./recordingService.types";
