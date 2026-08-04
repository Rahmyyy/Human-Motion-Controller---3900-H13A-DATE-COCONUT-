import type { MovementMapping, PressType } from "@/modules/movement-mapping";
import type { PoseFrame, PoseFrameSource } from "@/modules/pose-capture";

export interface RecognitionMatch {
  id: string;
  name: string;
  keybind: string;
  confidence: number;
  keypressTriggerThreshold: number;
  keypressType: PressType;
}

export interface RecognitionMappingStatus extends RecognitionMatch {
  isActive: boolean;
}

export interface TriggerDecision {
  mappingId: string;
  keybind: string;
  keypressType: PressType;
}

export interface RecognitionStatus {
  bestMatch: RecognitionMatch | null;
  mappingStatuses: RecognitionMappingStatus[];
  triggeredMappingId: string | null;
  waitingForDefaultPose: boolean;
  error: string | null;
}

export interface RecognitionFrameResult {
  status: RecognitionStatus;
  triggerDecision: TriggerDecision | null;
  didRearm: boolean;
}

export interface RecognitionEngine {
  processFrame(frame: PoseFrame): RecognitionFrameResult | null;
  getStatus(): RecognitionStatus;
}

export interface RecognitionClock {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export type TriggerHandler = (decision: TriggerDecision) => Promise<void>;

export interface RecognitionRuntime {
  getSnapshot(): RecognitionStatus;
  subscribe(listener: () => void): () => void;
  start(): void;
  stop(): void;
}

export interface RecognitionInputs {
  mappings: MovementMapping[];
  defaultPoseFrames: PoseFrame[];
}

export interface RecognitionRuntimeInputs extends RecognitionInputs {
  poseSource: PoseFrameSource;
  clock: RecognitionClock;
  handleTrigger: TriggerHandler;
}
