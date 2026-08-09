import { createRecognitionEngine } from "./engine";
import type {
  RecognitionRuntime,
  RecognitionRuntimeInputs,
  RecognitionStatus,
  TriggerDecision,
} from "./types";

const NOTIFICATION_INTERVAL_MS = 100;
const TRIGGER_FEEDBACK_MS = 500;

class PoseRecognitionRuntime implements RecognitionRuntime {
  private readonly engine;
  private snapshot: RecognitionStatus;
  private readonly listeners = new Set<() => void>();
  private unsubscribeFrames: (() => void) | null = null;
  private notificationTimer: unknown = null;
  private triggerFeedbackTimer: unknown = null;
  private lastNotificationAt = 0;

  constructor(private readonly inputs: RecognitionRuntimeInputs) {
    this.engine = createRecognitionEngine(inputs);
    this.snapshot = this.engine.getStatus();
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = () => {
    if (!this.unsubscribeFrames) {
      this.unsubscribeFrames = this.inputs.poseSource.subscribeFrames(this.processFrame);
    }
  };

  stop = () => {
    this.unsubscribeFrames?.();
    this.unsubscribeFrames = null;
    if (this.notificationTimer !== null) this.inputs.clock.clearTimeout(this.notificationTimer);
    this.notificationTimer = null;
    this.clearTriggerFeedback();
  };

  private processFrame = (frame: Parameters<typeof this.engine.processFrame>[0]) => {
    const result = this.engine.processFrame(frame);
    if (!result) return;
    this.snapshot = {
      ...result.status,
      error: this.snapshot.error,
      triggeredMappingId: this.snapshot.triggeredMappingId,
    };
    if (result.triggerDecision) this.showTriggerFeedback(result.triggerDecision.mappingId);

    if (result.triggerDecision || result.didRearm) this.notifyImmediately();
    else this.notifyThrottled();

    if (result.triggerDecision) this.fireTrigger(result.triggerDecision);
  };

  private fireTrigger(decision: TriggerDecision) {
    void this.inputs
      .handleTrigger(decision)
      .then(() => {
        this.snapshot = { ...this.snapshot, error: null };
        this.notifyImmediately();
      })
      .catch((error) => {
        this.snapshot = {
          ...this.snapshot,
          error: error instanceof Error ? error.message : String(error),
        };
        this.notifyImmediately();
      });
  }

  private showTriggerFeedback(mappingId: string) {
    this.clearTriggerFeedback();
    this.snapshot = { ...this.snapshot, triggeredMappingId: mappingId };
    this.triggerFeedbackTimer = this.inputs.clock.setTimeout(() => {
      this.triggerFeedbackTimer = null;
      this.snapshot = { ...this.snapshot, triggeredMappingId: null };
      this.notifyImmediately();
    }, TRIGGER_FEEDBACK_MS);
  }

  private clearTriggerFeedback() {
    if (this.triggerFeedbackTimer !== null) {
      this.inputs.clock.clearTimeout(this.triggerFeedbackTimer);
    }
    this.triggerFeedbackTimer = null;
    if (this.snapshot.triggeredMappingId !== null) {
      this.snapshot = { ...this.snapshot, triggeredMappingId: null };
    }
  }

  private notifyThrottled() {
    const elapsed = this.inputs.clock.now() - this.lastNotificationAt;
    if (elapsed >= NOTIFICATION_INTERVAL_MS) {
      this.notify();
      return;
    }
    if (this.notificationTimer !== null) return;
    this.notificationTimer = this.inputs.clock.setTimeout(() => {
      this.notificationTimer = null;
      this.notify();
    }, NOTIFICATION_INTERVAL_MS - elapsed);
  }

  private notifyImmediately() {
    if (this.notificationTimer !== null) this.inputs.clock.clearTimeout(this.notificationTimer);
    this.notificationTimer = null;
    this.notify();
  }

  private notify() {
    this.lastNotificationAt = this.inputs.clock.now();
    this.listeners.forEach((listener) => listener());
  }
}

export function createRecognitionRuntime(inputs: RecognitionRuntimeInputs): RecognitionRuntime {
  return new PoseRecognitionRuntime(inputs);
}
