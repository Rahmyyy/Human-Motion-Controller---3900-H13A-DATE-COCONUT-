import {
  normalizePoseFrame,
  type NormalizedPoseFrame,
  type PoseFrame,
} from "@/modules/pose-capture";
import { compareDefaultPose } from "./compareMovement";
import { findTemplateMatches, trimLiveBuffer } from "./findBestMatch";
import {
  advanceRecognitionGate,
  createRecognitionGateState,
  type RecognitionGateState,
} from "./recognitionGate";
import { selectAcceptedMatch } from "./selectAcceptedMatch";
import type { PreparedMovementPlan } from "@/modules/movement-mapping";
import type { RecognitionMatch } from "../types";

export type RecognitionSessionState = {
  liveFrames: NormalizedPoseFrame[];
  gate: RecognitionGateState;
};

export type RecognitionFrameResult = {
  state: RecognitionSessionState;
  bestMatch: RecognitionMatch | null;
  matches: RecognitionMatch[];
  defaultPoseConfidence: number;
  waitingForDefaultPose: boolean;
  triggeredMatch: RecognitionMatch | null;
};

export function createRecognitionSessionState(): RecognitionSessionState {
  return { liveFrames: [], gate: createRecognitionGateState() };
}

export function processRecognitionFrame(
  current: RecognitionSessionState,
  frame: PoseFrame,
  templates: PreparedMovementPlan[],
  defaultPoseFrames: NormalizedPoseFrame[],
): RecognitionFrameResult | null {
  const normalizedFrame = normalizePoseFrame(frame);
  if (!normalizedFrame || templates.length === 0) return null;

  const liveFrames = trimLiveBuffer(
    [...current.liveFrames, normalizedFrame],
    normalizedFrame.timestampMs,
  );
  const matches = findTemplateMatches(templates, liveFrames);
  const defaultPoseConfidence = compareDefaultPose(defaultPoseFrames, liveFrames);
  const acceptedMatch = selectAcceptedMatch(matches, defaultPoseConfidence);
  const gate = advanceRecognitionGate(
    current.gate,
    acceptedMatch?.id ?? null,
    defaultPoseConfidence,
  );
  const clearLiveFrames = gate.shouldTrigger || gate.didRearm;

  return {
    state: {
      liveFrames: clearLiveFrames ? [] : liveFrames,
      gate: gate.state,
    },
    bestMatch: gate.didRearm ? null : (matches[0] ?? null),
    matches: gate.didRearm ? [] : matches,
    defaultPoseConfidence,
    waitingForDefaultPose: gate.state.phase === "waiting-for-default",
    triggeredMatch: gate.shouldTrigger && acceptedMatch ? acceptedMatch : null,
  };
}
