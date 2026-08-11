import { vi } from "vitest";
import type { Preset } from "@/modules/patient-presets";
import { TRACKED_LANDMARKS } from "@/modules/pose-capture";
import { stillPoseFrames, wavingPoseFrames } from "@/modules/pose-capture/testPoses";
import { serializeMappingPoseFrames } from "./serialization";
import {
  PressType,
  type MovementMapping,
  type MovementMappingDetails,
  type MovementMappingRepository,
} from "./types";

/** A saved wrist sweep — long and distinct enough to prepare a recognition plan from. */
export const WAVE_FRAMES_JSON = serializeMappingPoseFrames(wavingPoseFrames(30));

/** A saved held pose, which recognition treats as static rather than dynamic. */
export const HELD_POSE_FRAMES_JSON = serializeMappingPoseFrames(stillPoseFrames(30));

export function mapping(overrides: Partial<MovementMapping> = {}): MovementMapping {
  return {
    id: "mapping-1",
    name: "right arm raise",
    keybind: "Spacebar",
    keypressType: PressType.Click,
    poseFramesJson: WAVE_FRAMES_JSON,
    selectedLandmarks: [...TRACKED_LANDMARKS],
    thresholdPercentage: 100,
    keypressTriggerThresholdPercentage: 60,
    ...overrides,
  };
}

export function mappingDetails(
  overrides: Partial<MovementMappingDetails> = {},
): MovementMappingDetails {
  return { ...mapping(), presetId: "preset-1", ...overrides };
}

/** A stand-in store that succeeds at everything; a test overrides only the call it exercises. */
export function repositoryStub() {
  return {
    create: vi.fn<MovementMappingRepository["create"]>().mockResolvedValue(undefined),
    list: vi.fn<MovementMappingRepository["list"]>().mockResolvedValue([mapping()]),
    get: vi.fn<MovementMappingRepository["get"]>().mockResolvedValue(mappingDetails()),
    update: vi.fn<MovementMappingRepository["update"]>().mockResolvedValue(undefined),
    delete: vi.fn<MovementMappingRepository["delete"]>().mockResolvedValue(undefined),
    updateThreshold: vi
      .fn<MovementMappingRepository["updateThreshold"]>()
      .mockResolvedValue(undefined),
  };
}

/** Loads the preset a collection or editor belongs to. */
export const presetLoaderStub = () => vi.fn<(id: string, patientId: string) => Promise<Preset>>();
