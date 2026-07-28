import type { PoseFrame } from "@/features/camera/poseFrame";
import type { Preset } from "@/features/presets/api/presetsApi";
import type { PresetMappingCardData } from "../types";

export interface PresetMappingViewData extends PresetMappingCardData {
  poseFrames: PoseFrame[];
}

export interface PresetMappingsSnapshot {
  deletingMappingId: string | null;
  error: string | null;
  isLoading: boolean;
  mappings: PresetMappingViewData[];
  preset: Preset | null;
}

/** Owns one preset's mapping collection, calibration state, and deletion workflow. */
export interface PresetMappingsService {
  getSnapshot(): PresetMappingsSnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string | undefined, presetId: string | undefined): Promise<void>;
  dispose(): void;
  deleteMapping(mappingId: string): Promise<boolean>;
}
