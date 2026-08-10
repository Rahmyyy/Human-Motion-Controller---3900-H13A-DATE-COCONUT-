import { describe, expect, it } from "vitest";
import { advanceRecognitionGate, createRecognitionGateState } from "./recognitionGate";
import type { RecognitionGateState } from "./recognitionGate";

const RESTING = 0.9;
const NOT_RESTING = 0.4;

/** Feeds the gate the same accepted match repeatedly, as a held movement would. */
function holdMatch(matchId: string | null, frames: number, from = createRecognitionGateState()) {
  let state = from;
  let last = advanceRecognitionGate(state, matchId, NOT_RESTING);
  for (let frame = 1; frame < frames; frame += 1) {
    state = last.state;
    last = advanceRecognitionGate(state, matchId, NOT_RESTING);
  }
  return last;
}

describe("createRecognitionGateState", () => {
  it("starts ready, with no movement under consideration", () => {
    expect(createRecognitionGateState()).toEqual({
      phase: "ready",
      candidateId: "",
      candidateFrames: 0,
    });
  });
});

describe("advanceRecognitionGate while ready", () => {
  it("builds confidence over consecutive frames of the same movement", () => {
    const transition = holdMatch("wave", 4);

    expect(transition.state).toEqual({
      phase: "ready",
      candidateId: "wave",
      candidateFrames: 4,
    });
    expect(transition.shouldTrigger).toBe(false);
  });

  it("fires the key once the movement has held for long enough", () => {
    const transition = holdMatch("wave", 5);

    expect(transition.shouldTrigger).toBe(true);
    expect(transition.state).toEqual({ phase: "waiting-for-default", defaultPoseFrames: 0 });
  });

  it("starts counting again when a different movement takes over", () => {
    const wave = holdMatch("wave", 4);

    const transition = advanceRecognitionGate(wave.state, "nod", NOT_RESTING);

    expect(transition.state).toEqual({ phase: "ready", candidateId: "nod", candidateFrames: 1 });
  });

  /** A single unrecognised frame forgets the streak, so a stray match cannot fire the key. */
  it("forgets the streak on a frame that recognises nothing", () => {
    const wave = holdMatch("wave", 4);

    const transition = advanceRecognitionGate(wave.state, null, NOT_RESTING);

    expect(transition.state).toEqual(createRecognitionGateState());
    expect(transition.shouldTrigger).toBe(false);
  });
});

describe("advanceRecognitionGate while waiting for the resting pose", () => {
  const waiting: RecognitionGateState = { phase: "waiting-for-default", defaultPoseFrames: 0 };

  it("counts the frames the patient has spent back at rest", () => {
    const transition = advanceRecognitionGate(waiting, null, RESTING);

    expect(transition.state).toEqual({ phase: "waiting-for-default", defaultPoseFrames: 1 });
    expect(transition.didRearm).toBe(false);
  });

  it("rearms once the patient has held the resting pose", () => {
    const held = { phase: "waiting-for-default", defaultPoseFrames: 2 } as const;

    const transition = advanceRecognitionGate(held, null, RESTING);

    expect(transition.didRearm).toBe(true);
    expect(transition.state).toEqual(createRecognitionGateState());
    expect(transition.shouldTrigger).toBe(false);
  });

  it("starts the resting count again the moment the patient moves", () => {
    const held = { phase: "waiting-for-default", defaultPoseFrames: 2 } as const;

    const transition = advanceRecognitionGate(held, null, NOT_RESTING);

    expect(transition.state).toEqual({ phase: "waiting-for-default", defaultPoseFrames: 0 });
  });

  /** Holding the movement cannot fire the key twice; only returning to rest clears the gate. */
  it("ignores a movement that is still being recognised", () => {
    const transition = advanceRecognitionGate(waiting, "wave", NOT_RESTING);

    expect(transition.shouldTrigger).toBe(false);
    expect(transition.state).toEqual({ phase: "waiting-for-default", defaultPoseFrames: 0 });
  });
});
