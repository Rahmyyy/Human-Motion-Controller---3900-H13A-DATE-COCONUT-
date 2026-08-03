import { invoke } from "@tauri-apps/api/core";
import type { PressType } from "@/features/movement-recognition/recognition/types";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";

interface CreateMovementMappingInput extends Record<string, unknown> {
  keybind: string;
  keypressType: PressType;
  name: string;
  poseFramesJson: string;
  presetId: string;
  selectedLandmarks: number[];
  keypressTriggerThresholdPercentage: number;
}

export interface MovementMappingDetailsResponse {
  id: string;
  preset_id: string;
  name: string;
  keybind: string;
  keypress_type: PressType;
  pose_frames_json: string;
  // Details is serialized snake_case on the Rust side (unlike the camelCase list summary).
  selected_landmarks: number[];
  threshold_percentage: number;
  keypress_trigger_threshold_percentage: number;
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
  keypressType: PressType;
  poseFramesJson: string;
  selectedLandmarks: number[];
  keypressTriggerThresholdPercentage: number;
}

export function updateMovementMapping(input: UpdateMovementMappingInput) {
  return invoke<void>("update_movement_mapping", input);
}

export function updateMovementMappingThreshold(
  id: string,
  presetId: string,
  thresholdPercentage: number,
) {
  return invoke<void>("update_movement_mapping_threshold", {
    id,
    presetId,
    thresholdPercentage,
  });
}
