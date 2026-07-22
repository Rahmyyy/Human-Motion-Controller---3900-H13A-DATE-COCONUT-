import {
  createPreset as createPresetApi,
  deletePreset as deletePresetApi,
  duplicatePreset as duplicatePresetApi,
  getPresets,
  type Preset,
} from "../api/presetsApi";
import type {
  PresetSelectionService,
  PresetSelectionSnapshot,
} from "./presetSelectionService.types";

type Listener = () => void;

class PresetLibrarySelectionService implements PresetSelectionService {
  private snapshot: PresetSelectionSnapshot = emptySnapshot();
  private readonly listeners = new Set<Listener>();
  private operationToken = 0;

  getSnapshot = () => this.snapshot;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async () => {
    const token = ++this.operationToken;
    this.publish({ error: null, isLoading: true });

    try {
      const presets = await getPresets();
      if (token !== this.operationToken) return;
      this.publish({ isLoading: false, presets });
    } catch (error) {
      if (token !== this.operationToken) return;
      console.error("Failed to load presets", error);
      this.publish({ error: "Failed to load presets.", isLoading: false });
    }
  };

  dispose = () => {
    ++this.operationToken;
  };

  selectPreset = (presetId: string) => {
    const selectedPresetId = this.snapshot.selectedPresetId === presetId ? null : presetId;
    this.publishSelection(selectedPresetId);
  };

  createPreset = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || this.snapshot.isCreating) return null;

    this.publish({ createError: null, isCreating: true });
    try {
      const created = await createPresetApi(trimmedName);
      this.snapshot = {
        ...this.snapshot,
        createError: null,
        isCreating: false,
        presets: [created, ...this.snapshot.presets],
      };
      this.publishSelection(created.id);
      return created;
    } catch (error) {
      console.error("Failed to create preset", error);
      this.publish({ createError: "This preset could not be created. Please try again." });
      return null;
    } finally {
      if (this.snapshot.isCreating) this.publish({ isCreating: false });
    }
  };

  duplicatePreset = async (presetId: string) => {
    if (this.snapshot.duplicatingPresetId) return null;

    this.publish({ duplicateError: null, duplicatingPresetId: presetId });
    try {
      const duplicate = await duplicatePresetApi(presetId);
      this.snapshot = {
        ...this.snapshot,
        duplicateError: null,
        duplicatingPresetId: null,
        presets: [duplicate, ...this.snapshot.presets],
      };
      this.publishSelection(duplicate.id);
      return duplicate;
    } catch (error) {
      console.error("Failed to duplicate preset", error);
      this.publish({
        duplicateError: {
          message: "This preset could not be duplicated. Please try again.",
          presetId,
        },
      });
      return null;
    } finally {
      if (this.snapshot.duplicatingPresetId === presetId) {
        this.publish({ duplicatingPresetId: null });
      }
    }
  };

  deletePreset = async (presetId: string) => {
    if (this.snapshot.deletingPresetId) return false;

    this.publish({ deleteError: null, deletingPresetId: presetId });
    try {
      await deletePresetApi(presetId);
      const presets = this.snapshot.presets.filter((preset) => preset.id !== presetId);
      const selectedPresetId =
        this.snapshot.selectedPresetId === presetId ? null : this.snapshot.selectedPresetId;
      this.snapshot = {
        ...this.snapshot,
        deleteError: null,
        deletingPresetId: null,
        presets,
      };
      this.publishSelection(selectedPresetId);
      return true;
    } catch (error) {
      console.error("Failed to delete preset", error);
      this.publish({
        deleteError: {
          message: "This preset could not be deleted. Please try again.",
          presetId,
        },
      });
      return false;
    } finally {
      if (this.snapshot.deletingPresetId === presetId) {
        this.publish({ deletingPresetId: null });
      }
    }
  };

  clearCreateError = () => this.publish({ createError: null });

  clearDuplicateError = () => this.publish({ duplicateError: null });

  clearDeleteError = () => this.publish({ deleteError: null });

  private publishSelection(selectedPresetId: string | null) {
    this.snapshot = {
      ...this.snapshot,
      error: null,
      selectedPreset: findPreset(this.snapshot.presets, selectedPresetId),
      selectedPresetId,
    };
    this.notify();
  }

  private publish(update: Partial<PresetSelectionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    if (update.presets) {
      this.snapshot = {
        ...this.snapshot,
        selectedPreset: findPreset(update.presets, this.snapshot.selectedPresetId),
      };
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

function emptySnapshot(): PresetSelectionSnapshot {
  return {
    createError: null,
    deleteError: null,
    deletingPresetId: null,
    duplicateError: null,
    duplicatingPresetId: null,
    error: null,
    isCreating: false,
    isLoading: true,
    presets: [],
    selectedPreset: null,
    selectedPresetId: null,
  };
}

function findPreset(presets: Preset[], presetId: string | null) {
  return presets.find((preset) => preset.id === presetId) ?? null;
}

export function createPresetSelectionService(): PresetSelectionService {
  return new PresetLibrarySelectionService();
}

export type {
  PresetMutationError,
  PresetSelectionService,
  PresetSelectionSnapshot,
} from "./presetSelectionService.types";
