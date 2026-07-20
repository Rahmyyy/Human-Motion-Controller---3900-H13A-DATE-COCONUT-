import { poseService } from "@/features/camera/services/poseService";
import type { PoseFrame } from "@/features/camera/poseFrame";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import { recordSuccessfulTrigger } from "@/lib/liveSessionState";
import { buildMappingStatuses } from "../recognition/buildMappingStatuses";
import { normalizePoseFrames } from "../recognition/normalizePose";
import { prepareMovementTemplates } from "../recognition/prepareTemplates";
import { pressMatchedKey } from "../recognition/pressMatchedKey";
import {
  createRecognitionSessionState,
  processRecognitionFrame,
} from "../recognition/processRecognitionFrame";
import type { RecognitionMatch } from "../recognition/types";
import type { RecognitionService, RecognitionStatus } from "./recognitionService.types";

type Listener = () => void;
const NOTIFICATION_INTERVAL_MS = 100;

class MovementRecognitionService implements RecognitionService {
  private readonly mappings: PresetMappingCardData[];
  private readonly templates;
  private readonly defaultPoseFrames;
  private session = createRecognitionSessionState();
  private snapshot: RecognitionStatus;
  private readonly listeners = new Set<Listener>();
  private unsubscribeFrames: (() => void) | null = null;
  private notificationTimer: number | null = null;
  private lastNotificationAt = 0;

  constructor(mappings: PresetMappingCardData[], defaultPoseFrames: PoseFrame[]) {
    this.mappings = mappings;
    this.templates = prepareMovementTemplates(mappings);
    this.defaultPoseFrames = normalizePoseFrames(defaultPoseFrames);
    this.snapshot = {
      bestMatch: null,
      mappingStatuses: buildMappingStatuses(mappings, []),
      waitingForDefaultPose: false,
      error: null,
    };
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = () => {
    if (!this.unsubscribeFrames) {
      this.unsubscribeFrames = poseService.subscribeFrames(this.processFrame);
    }
  };

  stop = () => {
    this.unsubscribeFrames?.();
    this.unsubscribeFrames = null;
    if (this.notificationTimer !== null) window.clearTimeout(this.notificationTimer);
    this.notificationTimer = null;
  };

  private processFrame = (frame: PoseFrame) => {
    const wasWaiting = this.session.gate.phase === "waiting-for-default";
    const result = processRecognitionFrame(
      this.session,
      frame,
      this.templates,
      this.defaultPoseFrames,
    );
    if (!result) return;

    this.session = result.state;
    this.snapshot = {
      bestMatch: result.bestMatch,
      mappingStatuses: buildMappingStatuses(
        this.mappings,
        result.matches,
        result.defaultPoseConfidence,
        !result.waitingForDefaultPose,
      ),
      waitingForDefaultPose: result.waitingForDefaultPose,
      error: this.snapshot.error,
    };

    const didRearm = wasWaiting && !result.waitingForDefaultPose;
    if (result.triggeredMatch || didRearm) {
      this.notifyImmediately();
    } else {
      this.notifyThrottled();
    }

    if (result.triggeredMatch) this.fireTrigger(result.triggeredMatch);
  };

  private fireTrigger(match: RecognitionMatch) {
    void pressMatchedKey(match)
      .then(() => {
        recordSuccessfulTrigger();
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

  private notifyThrottled() {
    const elapsed = performance.now() - this.lastNotificationAt;
    if (elapsed >= NOTIFICATION_INTERVAL_MS) {
      this.notify();
      return;
    }
    if (this.notificationTimer !== null) return;
    this.notificationTimer = window.setTimeout(() => {
      this.notificationTimer = null;
      this.notify();
    }, NOTIFICATION_INTERVAL_MS - elapsed);
  }

  private notifyImmediately() {
    if (this.notificationTimer !== null) window.clearTimeout(this.notificationTimer);
    this.notificationTimer = null;
    this.notify();
  }

  private notify() {
    this.lastNotificationAt = performance.now();
    this.listeners.forEach((listener) => listener());
  }
}

export function createRecognitionService(
  mappings: PresetMappingCardData[],
  defaultPoseFrames: PoseFrame[] = [],
): RecognitionService {
  return new MovementRecognitionService(mappings, defaultPoseFrames);
}

export type { RecognitionService, RecognitionStatus } from "./recognitionService.types";
