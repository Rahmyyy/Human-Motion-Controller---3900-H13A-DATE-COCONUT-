import { parsePoseFrames } from "@/features/camera/parsePoseFrames";
import {
  deleteMovementMapping,
  getMovementMappings,
} from "@/features/movement-mapping/api/movementMappingsApi";
import { getPreset } from "@/features/presets/api/presetsApi";
import type { PresetMappingsService, PresetMappingsSnapshot } from "./presetMappingsService.types";

type Listener = () => void;

class PresetMappingCollectionService implements PresetMappingsService {
  private snapshot: PresetMappingsSnapshot = emptySnapshot();
  private readonly listeners = new Set<Listener>();
  private presetId: string | null = null;
  private operationToken = 0;

  getSnapshot = () => this.snapshot;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async (patientId: string | undefined, presetId: string | undefined) => {
    const token = ++this.operationToken;
    this.presetId = presetId ?? null;
    this.snapshot = { ...emptySnapshot(), isLoading: true };

    if (!patientId || !presetId) {
      this.publish({ error: "Preset not found.", isLoading: false });
      return;
    }

    this.notify();
    try {
      const [preset, mappings] = await Promise.all([
        getPreset(presetId, patientId),
        getMovementMappings(presetId),
      ]);
      if (token !== this.operationToken) return;
      this.publish({
        isLoading: false,
        mappings: mappings.map((mapping) => ({
          ...mapping,
          poseFrames: parsePoseFrames(mapping.poseFramesJson),
        })),
        preset,
      });
    } catch (error) {
      if (token !== this.operationToken) return;
      console.error("Failed to load preset mappings", error);
      this.publish({ error: "Failed to load preset mappings.", isLoading: false });
    }
  };

  dispose = () => {
    ++this.operationToken;
  };

  deleteMapping = async (mappingId: string) => {
    if (!this.presetId || this.snapshot.deletingMappingId) return false;

    this.publish({ deletingMappingId: mappingId, error: null });
    try {
      await deleteMovementMapping(mappingId, this.presetId);
      this.publish({
        deletingMappingId: null,
        mappings: this.snapshot.mappings.filter((mapping) => mapping.id !== mappingId),
      });
      return true;
    } catch (error) {
      console.error("Failed to delete movement mapping", error);
      this.publish({ error: "Failed to delete movement mapping." });
      return false;
    } finally {
      if (this.snapshot.deletingMappingId === mappingId) {
        this.publish({ deletingMappingId: null });
      }
    }
  };

  private publish(update: Partial<PresetMappingsSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

function emptySnapshot(): PresetMappingsSnapshot {
  return {
    deletingMappingId: null,
    error: null,
    isLoading: false,
    mappings: [],
    preset: null,
  };
}

export function createPresetMappingsService(): PresetMappingsService {
  return new PresetMappingCollectionService();
}

export type {
  PresetMappingsService,
  PresetMappingsSnapshot,
  PresetMappingViewData,
} from "./presetMappingsService.types";
