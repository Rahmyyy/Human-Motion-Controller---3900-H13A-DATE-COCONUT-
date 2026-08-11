import { describe, expect, it } from "vitest";
import { TRACKED_LANDMARKS } from "@/modules/pose-capture";
import { hideAllBut, stillPoseFrames, wavingPoseFrames } from "@/modules/pose-capture/testPoses";
import { prepareMovementPlans } from "./recognitionPlan";
import { serializeMappingPoseFrames } from "./serialization";
import { HELD_POSE_FRAMES_JSON, mapping } from "./testMappings";
import { PressType } from "./types";

const planFor = (...mappings: Parameters<typeof prepareMovementPlans>[0]) =>
  prepareMovementPlans(mappings)[0];

describe("prepareMovementPlans", () => {
  it("prepares a saved movement for recognition", () => {
    const plan = planFor(mapping({ id: "wave", name: "wave", keybind: "Enter" }));

    expect(plan).toMatchObject({
      id: "wave",
      name: "wave",
      keybind: "Enter",
      keypressType: PressType.Click,
      isDynamic: true,
      keypressTriggerThreshold: 0.6,
    });
    expect(plan.activeLandmarks).toEqual([...TRACKED_LANDMARKS]);
    expect(plan.durationMs).toBeGreaterThan(0);
  });

  it("prepares a held pose as a static movement", () => {
    const plan = planFor(mapping({ poseFramesJson: HELD_POSE_FRAMES_JSON }));

    expect(plan.isDynamic).toBe(false);
  });

  it("weighs the joint that does the moving above the ones held still", () => {
    const plan = planFor(mapping());

    expect(plan.landmarkWeights[16]).toBeGreaterThan(plan.landmarkWeights[11]);
  });

  it("watches only the joints the clinician selected", () => {
    const plan = planFor(mapping({ selectedLandmarks: [15, 16] }));

    expect(plan.activeLandmarks).toEqual([15, 16]);
  });

  it("carries the movement's own trigger threshold", () => {
    const plan = planFor(mapping({ keypressTriggerThresholdPercentage: 85 }));

    expect(plan.keypressTriggerThreshold).toBe(0.85);
  });

  /** The saved threshold decides how much of the recording counts as the movement. */
  it("trims the recording to the saved movement threshold", () => {
    const full = planFor(mapping({ thresholdPercentage: 100 }));
    const trimmed = planFor(mapping({ thresholdPercentage: 80 }));

    expect(trimmed.durationMs).toBeLessThan(full.durationMs);
  });

  it("treats a mapping saved before thresholds existed as using the whole recording", () => {
    const legacy = mapping({ thresholdPercentage: undefined as unknown as number });

    expect(planFor(legacy).durationMs).toBe(
      planFor(mapping({ thresholdPercentage: 100 })).durationMs,
    );
  });

  it("drops its idle lead-in so recognition starts where the movement does", () => {
    const delayed = serializeMappingPoseFrames([
      ...stillPoseFrames(10),
      ...wavingPoseFrames(30, 400),
    ]);

    const plan = planFor(mapping({ poseFramesJson: delayed }));

    expect(plan.frames[0]?.timestampMs).toBeGreaterThan(0);
  });

  it("has nothing to prepare for a preset with no movements", () => {
    expect(prepareMovementPlans([])).toEqual([]);
  });

  it("skips a movement whose recording was never saved", () => {
    expect(prepareMovementPlans([mapping({ poseFramesJson: "[]" })])).toEqual([]);
  });

  it("skips a movement recorded as a single instant", () => {
    const singleFrame = serializeMappingPoseFrames(stillPoseFrames(1));

    expect(prepareMovementPlans([mapping({ poseFramesJson: singleFrame })])).toEqual([]);
  });

  it("skips a movement recorded with the patient out of shot", () => {
    const outOfShot = serializeMappingPoseFrames(stillPoseFrames(30, 0, hideAllBut(25, 26)));

    expect(prepareMovementPlans([mapping({ poseFramesJson: outOfShot })])).toEqual([]);
  });

  it("prepares every movement a preset defines", () => {
    const plans = prepareMovementPlans([mapping({ id: "a" }), mapping({ id: "b" })]);

    expect(plans.map((plan) => plan.id)).toEqual(["a", "b"]);
  });
});
