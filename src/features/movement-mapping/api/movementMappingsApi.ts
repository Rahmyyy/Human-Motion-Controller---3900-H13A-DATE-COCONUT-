import { invoke } from "@tauri-apps/api/core";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";

interface CreateMovementMappingInput extends Record<string, unknown> {
  keybind: string;
  name: string;
  poseFramesJson: string;
  presetId: string;
}

export function createMovementMapping(input: CreateMovementMappingInput) {
  return invoke("create_movement_mapping", input);
}

export function getMovementMappings(presetId: string) {
  return invoke<PresetMappingCardData[]>("get_movement_mappings", { presetId });
}
