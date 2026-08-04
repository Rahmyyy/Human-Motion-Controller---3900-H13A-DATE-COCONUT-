import {
  DEFAULT_POSE_REARM_THRESHOLD,
  REQUIRED_CONSECUTIVE_MATCHES,
  REQUIRED_DEFAULT_POSE_FRAMES,
} from "./recognitionConfig";

export type RecognitionGateState =
  | {
      phase: "ready";
      candidateId: string;
      candidateFrames: number;
    }
  | {
      phase: "waiting-for-default";
      defaultPoseFrames: number;
    };

export type RecognitionGateTransition = {
  state: RecognitionGateState;
  shouldTrigger: boolean;
  didRearm: boolean;
};

export function createRecognitionGateState(): RecognitionGateState {
  return { phase: "ready", candidateId: "", candidateFrames: 0 };
}

export function advanceRecognitionGate(
  current: RecognitionGateState,
  acceptedMatchId: string | null,
  defaultPoseConfidence: number,
): RecognitionGateTransition {
  if (current.phase === "waiting-for-default") {
    return advanceDefaultPoseGate(current, defaultPoseConfidence);
  }

  if (!acceptedMatchId) {
    return transition(createRecognitionGateState());
  }

  const candidateFrames = current.candidateId === acceptedMatchId ? current.candidateFrames + 1 : 1;
  if (candidateFrames >= REQUIRED_CONSECUTIVE_MATCHES) {
    return {
      state: { phase: "waiting-for-default", defaultPoseFrames: 0 },
      shouldTrigger: true,
      didRearm: false,
    };
  }

  return transition({
    phase: "ready",
    candidateId: acceptedMatchId,
    candidateFrames,
  });
}

function advanceDefaultPoseGate(
  current: Extract<RecognitionGateState, { phase: "waiting-for-default" }>,
  confidence: number,
): RecognitionGateTransition {
  const defaultPoseFrames =
    confidence >= DEFAULT_POSE_REARM_THRESHOLD ? current.defaultPoseFrames + 1 : 0;

  return defaultPoseFrames >= REQUIRED_DEFAULT_POSE_FRAMES
    ? {
        state: createRecognitionGateState(),
        shouldTrigger: false,
        didRearm: true,
      }
    : transition({ phase: "waiting-for-default", defaultPoseFrames });
}

function transition(state: RecognitionGateState): RecognitionGateTransition {
  return { state, shouldTrigger: false, didRearm: false };
}
