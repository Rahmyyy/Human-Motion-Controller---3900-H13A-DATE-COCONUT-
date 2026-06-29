import { invoke } from "@tauri-apps/api/core";

interface CreateMovementMappingInput extends Record<string, unknown> {
  keybind: string;
  name: string;
  poseFramesJson: string;
  presetId: string;
}

export function createMovementMapping(input: CreateMovementMappingInput) {
  return invoke("create_movement_mapping", input);
}
