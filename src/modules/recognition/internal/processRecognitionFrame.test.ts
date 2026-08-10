import { describe, expect, it } from "vitest";
import { normalizePoseFrames, type PoseFrame } from "@/modules/pose-capture";
import { hideAllBut, poseFrame, stillPoseFrames } from "@/modules/pose-capture/testPoses";
import { plan } from "../testPlans";
import {
  createRecognitionSessionState,
  processRecognitionFrame,
  type RecognitionSessionState,
} from "./processRecognitionFrame";

/** A held pose with the right arm stretched far out — nothing like the resting pose. */
const REACHING = { 16: { x: 1.44 } };
const reach = (timestampMs: number) => poseFrame(timestampMs, REACHING);
const templates = [
  plan("reach", stillPoseFrames(30, 0, REACHING), { keypressTriggerThreshold: 0.8 }),
];
const restingPose = normalizePoseFrames(stillPoseFrames(30));

/** Feeds frames through in order, the way the engine does, and hands back the last result. */
function run(frames: PoseFrame[], from = createRecognitionSessionState()) {
  let state: RecognitionSessionState = from;
  let last = null as ReturnType<typeof processRecognitionFrame>;
  for (const frame of frames) {
    last = processRecognitionFrame(state, frame, templates, restingPose);
    if (last) state = last.state;
  }
  return { state, result: last };
}

const reachFrames = (count: number, startMs = 0) =>
  Array.from({ length: count }, (_, index) => reach(startMs + index * 40));
const restFrames = (count: number, startMs = 0) =>
  Array.from({ length: count }, (_, index) => poseFrame(startMs + index * 40));

describe("createRecognitionSessionState", () => {
  it("starts with an empty buffer and an armed gate", () => {
    expect(createRecognitionSessionState()).toEqual({
      liveFrames: [],
      gate: { phase: "ready", candidateId: "", candidateFrames: 0 },
    });
  });
});

describe("processRecognitionFrame", () => {
  it("has nothing to say about a frame the patient is not in", () => {
    const frame = poseFrame(0, hideAllBut(25, 26));

    expect(
      processRecognitionFrame(createRecognitionSessionState(), frame, templates, []),
    ).toBeNull();
  });

  it("has nothing to say when the preset defines no movements", () => {
    expect(processRecognitionFrame(createRecognitionSessionState(), reach(0), [], [])).toBeNull();
  });

  it("scores the preset's movements against the buffered frames", () => {
    const { result } = run(reachFrames(1));

    expect(result?.bestMatch?.id).toBe("reach");
    expect(result?.matches).toHaveLength(1);
    expect(result?.bestMatch?.confidence).toBeCloseTo(1);
  });

  it("reports how close the patient is to their resting pose", () => {
    expect(run(restFrames(1)).result?.defaultPoseConfidence).toBeCloseTo(1);
  });

  it("keeps buffering while the movement is still being confirmed", () => {
    const { state, result } = run(reachFrames(4));

    expect(result?.triggeredMatch).toBeNull();
    expect(state.liveFrames).toHaveLength(4);
  });

  it("fires the movement once it has held for long enough", () => {
    const { state, result } = run(reachFrames(5));

    expect(result?.triggeredMatch?.id).toBe("reach");
    expect(result?.waitingForDefaultPose).toBe(true);
    expect(state.liveFrames).toEqual([]);
  });

  /** Holding the pose must not machine-gun the key. */
  it("does not fire again while the patient holds the movement", () => {
    const { result } = run(reachFrames(10));

    expect(result?.triggeredMatch).toBeNull();
    expect(result?.waitingForDefaultPose).toBe(true);
  });

  it("rearms once the patient has returned to their resting pose", () => {
    const triggered = run(reachFrames(5));
    const { state, result } = run(restFrames(3, 200), triggered.state);

    expect(result?.waitingForDefaultPose).toBe(false);
    expect(state.liveFrames).toEqual([]);
  });

  /** Nothing is reported on the rearm frame, so the panel does not flash a stale match. */
  it("reports no matches on the frame it rearms", () => {
    const triggered = run(reachFrames(5));

    const { result } = run(restFrames(3, 200), triggered.state);

    expect(result?.bestMatch).toBeNull();
    expect(result?.matches).toEqual([]);
  });

  it("can fire again after rearming", () => {
    const triggered = run(reachFrames(5));
    const rearmed = run(restFrames(3, 200), triggered.state);

    const { result } = run(reachFrames(5, 400), rearmed.state);

    expect(result?.triggeredMatch?.id).toBe("reach");
  });
});
