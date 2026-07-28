import type { Preset } from "../api/presetsApi";

export interface PresetMutationError {
  message: string;
  presetId: string;
}

export interface PresetSelectionSnapshot {
  createError: string | null;
  deleteError: PresetMutationError | null;
  deletingPresetId: string | null;
  duplicateError: PresetMutationError | null;
  duplicatingPresetId: string | null;
  error: string | null;
  isCreating: boolean;
  isLoading: boolean;
  presets: Preset[];
  selectedPreset: Preset | null;
  selectedPresetId: string | null;
}

/** Owns the preset list, selection, and create/duplicate/delete workflows. */
export interface PresetSelectionService {
  getSnapshot(): PresetSelectionSnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string | undefined): Promise<void>;
  dispose(): void;
  selectPreset(presetId: string): void;
  createPreset(name: string): Promise<Preset | null>;
  duplicatePreset(presetId: string): Promise<Preset | null>;
  deletePreset(presetId: string): Promise<boolean>;
  clearCreateError(): void;
  clearDuplicateError(): void;
  clearDeleteError(): void;
}
