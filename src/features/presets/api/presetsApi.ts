import { invoke } from "@tauri-apps/api/core";

export interface Preset {
  id: string;
  name: string;
  createdAt: string;
}

export function createPreset(name: string) {
  return invoke<Preset>("create_preset", { name });
}

export function getPreset(id: string) {
  return invoke<Preset>("get_preset", { id });
}
