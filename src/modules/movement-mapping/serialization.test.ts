import { describe, expect, it } from "vitest";
import { stillPoseFrames } from "@/modules/pose-capture/testPoses";
import { deserializeMappingPoseFrames, serializeMappingPoseFrames } from "./serialization";

describe("mapping pose frame storage", () => {
  it("reads back exactly what was saved", () => {
    const frames = stillPoseFrames(3);

    expect(deserializeMappingPoseFrames(serializeMappingPoseFrames(frames))).toEqual(frames);
  });

  it("saves an empty recording as an empty list", () => {
    expect(serializeMappingPoseFrames([])).toBe("[]");
  });

  it("reads a mapping with no usable recording as having no frames", () => {
    expect(deserializeMappingPoseFrames("not json")).toEqual([]);
  });
});
