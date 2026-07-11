import { invoke } from "@tauri-apps/api/core";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";

interface CreateMovementMappingInput extends Record<string, unknown> {
  keybind: string;
  name: string;
  poseFramesJson: string;
  presetId: string;
}

export interface MovementMappingDetailsResponse {
  id: string;
  preset_id: string;
  name: string;
  keybind: string;
  pose_frames_json: string;
}

export function createMovementMapping(input: CreateMovementMappingInput) {
  return invoke("create_movement_mapping", input);
}

export function getMovementMappings(presetId: string) {
  return invoke<PresetMappingCardData[]>("get_movement_mappings", { presetId });
}

export function getMovementMapping(id: string, presetId: string) {
  return invoke<MovementMappingDetailsResponse>("get_movement_mapping", { id, presetId });
}

export function deleteMovementMapping(id: string, presetId: string) {
  return invoke<void>("delete_movement_mapping", { id, presetId });
}

interface UpdateMovementMappingInput extends Record<string, unknown> {
  id: string;
  presetId: string;
  name: string;
  keybind: string;
  poseFramesJson: string;
}

export function updateMovementMapping(input: UpdateMovementMappingInput) {
  return invoke<void>("update_movement_mapping", input);
}
