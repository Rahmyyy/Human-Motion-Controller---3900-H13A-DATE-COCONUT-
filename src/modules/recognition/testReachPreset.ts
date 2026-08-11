import { serializeMappingPoseFrames } from "@/modules/movement-mapping";
import { mapping } from "@/modules/movement-mapping/testMappings";
import { stillPoseFrames } from "@/modules/pose-capture/testPoses";

/** A held pose with the right arm stretched far out � nothing like the resting pose. */
export const REACHING = { 16: { x: 1.44 } };

/**
 * A preset of one movement: reaching out. Held rather than swept, so every live frame scores the
 * same and a test can decide exactly when the gate fires.
 */
export const reachMapping = mapping({
  id: "reach",
  keybind: "Enter",
  poseFramesJson: serializeMappingPoseFrames(stillPoseFrames(30, 0, REACHING)),
  keypressTriggerThresholdPercentage: 80,
});
