import type { RecognitionMappingStatus, RecognitionMatch } from "../recognition/types";

export interface RecognitionStatus {
  bestMatch: RecognitionMatch | null;
  mappingStatuses: RecognitionMappingStatus[];
  waitingForDefaultPose: boolean;
  error: string | null;
}

/**
 * Owns recognition preparation and session state, processes every pose
 * frame, controls rearming and key triggers, and publishes UI status.
 */
export interface RecognitionService {
  getSnapshot(): RecognitionStatus;
  subscribe(listener: () => void): () => void;
  start(): void;
  stop(): void;
}
