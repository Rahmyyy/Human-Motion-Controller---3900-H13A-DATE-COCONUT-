import { invoke } from "@tauri-apps/api/core";

export interface Preset {
  id: string;
  patientId: string;
  name: string;
  createdAt: string;
  mappingCount: number;
  defaultPoseFramesJson: string | null;
}

export function createPreset(patientId: string, name: string) {
  return invoke<Preset>("create_preset", { patientId, name });
}

export function getPreset(id: string, patientId: string) {
  return invoke<Preset>("get_preset", { id, patientId });
}

export function getPresets(patientId: string) {
  return invoke<Preset[]>("get_presets", { patientId });
}

export function updateDefaultPose(id: string, patientId: string, defaultPoseFramesJson: string) {
  return invoke<Preset>("update_default_pose", { id, patientId, defaultPoseFramesJson });
}

export function duplicatePreset(id: string) {
  return invoke<Preset>("duplicate_preset", { id });
}

export function deletePreset(id: string) {
  return invoke<void>("delete_preset", { id });
}
