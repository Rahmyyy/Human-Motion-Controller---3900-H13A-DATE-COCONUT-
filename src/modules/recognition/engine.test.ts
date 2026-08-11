import { describe, expect, it } from "vitest";
import { serializeMappingPoseFrames } from "@/modules/movement-mapping";
import { mapping } from "@/modules/movement-mapping/testMappings";
import { hideAllBut, poseFrame, stillPoseFrames } from "@/modules/pose-capture/testPoses";
import { createRecognitionEngine } from "./engine";
import type { PoseFrame } from "@/modules/pose-capture";

/** A held pose with the right arm stretched far out — nothing like the resting pose. */
const REACHING = { 16: { x: 1.44 } };
const reachMapping = mapping({
  id: "reach",
  name: "reach out",
  keybind: "Enter",
  poseFramesJson: serializeMappingPoseFrames(stillPoseFrames(30, 0, REACHING)),
  keypressTriggerThresholdPercentage: 80,
});

const engine = () =>
  createRecognitionEngine({
    mappings: [reachMapping],
    defaultPoseFrames: stillPoseFrames(30),
  });

const reach = (timestampMs: number) => poseFrame(timestampMs, REACHING);

/** Feeds frames in order and hands back the last result the engine produced. */
function feed(recognition: ReturnType<typeof engine>, frames: PoseFrame[]) {
  return frames.reduce<ReturnType<typeof recognition.processFrame>>(
    (_, frame) => recognition.processFrame(frame),
    null,
  );
}

const reaching = (count: number, startMs = 0) =>
  Array.from({ length: count }, (_, index) => reach(startMs + index * 40));
const resting = (count: number, startMs = 0) =>
  Array.from({ length: count }, (_, index) => poseFrame(startMs + index * 40));

describe("createRecognitionEngine", () => {
  it("starts with every movement listed and nothing recognised", () => {
    expect(engine().getStatus()).toEqual({
      bestMatch: null,
      mappingStatuses: [
        {
          id: "reach",
          name: "reach out",
          keybind: "Enter",
          keypressType: "Click",
          confidence: 0,
          keypressTriggerThreshold: 0.8,
          isActive: false,
        },
      ],
      triggeredMappingId: null,
      waitingForDefaultPose: false,
      error: null,
    });
  });

  it("has nothing to report about a frame the patient is not in", () => {
    expect(engine().processFrame(poseFrame(0, hideAllBut(25, 26)))).toBeNull();
  });

  it("has nothing to report when no movement could be prepared for recognition", () => {
    const unusable = createRecognitionEngine({
      mappings: [mapping({ poseFramesJson: "[]" })],
      defaultPoseFrames: stillPoseFrames(30),
    });

    expect(unusable.processFrame(reach(0))).toBeNull();
    expect(unusable.getStatus().mappingStatuses).toHaveLength(1);
  });

  it("reports how well the patient's pose matches each movement", () => {
    const recognition = engine();

    const result = recognition.processFrame(reach(0));

    expect(result?.status.bestMatch?.id).toBe("reach");
    expect(result?.status.mappingStatuses[0]?.confidence).toBeCloseTo(1);
    expect(result?.triggerDecision).toBeNull();
  });

  it("keeps the latest report available to whoever asks for it", () => {
    const recognition = engine();

    recognition.processFrame(reach(0));

    expect(recognition.getStatus().bestMatch?.id).toBe("reach");
  });

  it("asks for the key press once the movement has held for long enough", () => {
    const recognition = engine();

    const result = feed(recognition, reaching(5));

    expect(result?.triggerDecision).toEqual({
      mappingId: "reach",
      keybind: "Enter",
      keypressType: "Click",
    });
    expect(result?.status.waitingForDefaultPose).toBe(true);
    expect(result?.didRearm).toBe(false);
  });

  it("stops highlighting movements until the patient returns to rest", () => {
    const recognition = engine();
    feed(recognition, reaching(5));

    const result = feed(recognition, reaching(3, 200));

    expect(result?.status.mappingStatuses[0]?.isActive).toBe(false);
    expect(result?.triggerDecision).toBeNull();
  });

  it("says so on the frame the patient becomes ready again", () => {
    const recognition = engine();
    feed(recognition, reaching(5));

    const result = feed(recognition, resting(3, 200));

    expect(result?.didRearm).toBe(true);
    expect(result?.status.waitingForDefaultPose).toBe(false);
  });

  it("reports rearming only on the frame it happens", () => {
    const recognition = engine();
    feed(recognition, reaching(5));
    feed(recognition, resting(3, 200));

    expect(recognition.processFrame(poseFrame(400))?.didRearm).toBe(false);
  });
});
