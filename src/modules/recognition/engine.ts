import { prepareMovementPlans } from "@/modules/movement-mapping";
import { normalizePoseFrames } from "@/modules/pose-capture";
import { buildMappingStatuses } from "./internal/buildMappingStatuses";
import {
  createRecognitionSessionState,
  processRecognitionFrame,
} from "./internal/processRecognitionFrame";
import type { RecognitionEngine, RecognitionInputs, RecognitionStatus } from "./types";

export function createRecognitionEngine({
  mappings,
  defaultPoseFrames,
}: RecognitionInputs): RecognitionEngine {
  const plans = prepareMovementPlans(mappings);
  const normalizedDefaultPose = normalizePoseFrames(defaultPoseFrames);
  let state = createRecognitionSessionState();
  let status: RecognitionStatus = {
    bestMatch: null,
    mappingStatuses: buildMappingStatuses(mappings, []),
    triggeredMappingId: null,
    waitingForDefaultPose: false,
    error: null,
  };

  return {
    getStatus: () => status,
    processFrame(frame) {
      const wasWaiting = state.gate.phase === "waiting-for-default";
      const result = processRecognitionFrame(state, frame, plans, normalizedDefaultPose);
      if (!result) return null;
      state = result.state;
      status = {
        bestMatch: result.bestMatch,
        mappingStatuses: buildMappingStatuses(
          mappings,
          result.matches,
          result.defaultPoseConfidence,
          !result.waitingForDefaultPose,
        ),
        triggeredMappingId: null,
        waitingForDefaultPose: result.waitingForDefaultPose,
        error: null,
      };
      const triggered = result.triggeredMatch;
      return {
        status,
        triggerDecision: triggered
          ? {
              mappingId: triggered.id,
              keybind: triggered.keybind,
              keypressType: triggered.keypressType,
            }
          : null,
        didRearm: wasWaiting && !result.waitingForDefaultPose,
      };
    },
  };
}
