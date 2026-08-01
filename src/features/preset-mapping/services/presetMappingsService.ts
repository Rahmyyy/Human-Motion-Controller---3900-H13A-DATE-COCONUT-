import { parsePoseFrames } from "@/features/camera/parsePoseFrames";
import {
  deleteMovementMapping,
  getMovementMappings,
  updateMovementMappingThreshold,
} from "@/features/movement-mapping/api/movementMappingsApi";
import { movementThresholdSettings } from "@/features/movement-mapping/threshold/movementThreshold";
import { getPreset } from "@/features/presets/api/presetsApi";
import type { PresetMappingsService, PresetMappingsSnapshot } from "./presetMappingsService.types";

type Listener = () => void;

class PresetMappingCollectionService implements PresetMappingsService {
  private snapshot: PresetMappingsSnapshot = emptySnapshot();
  private readonly listeners = new Set<Listener>();
  private presetId: string | null = null;
  private operationToken = 0;
  private readonly thresholdOperationTokens = new Map<string, number>();

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
    this.thresholdOperationTokens.clear();
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

  updateThreshold = async (mappingId: string, thresholdPercentage: number) => {
    if (!this.presetId) return false;
    const mapping = this.snapshot.mappings.find((candidate) => candidate.id === mappingId);
    if (!mapping || mapping.thresholdPercentage === thresholdPercentage) return true;
    const threshold = movementThresholdSettings(
      mapping.poseFrames,
      mapping.selectedLandmarks,
      thresholdPercentage,
    );
    if (
      !threshold ||
      thresholdPercentage < threshold.minimumPercentage ||
      thresholdPercentage > 100
    ) {
      this.publishThresholdState(mappingId, "error");
      return false;
    }

    const token = (this.thresholdOperationTokens.get(mappingId) ?? 0) + 1;
    this.thresholdOperationTokens.set(mappingId, token);
    const previousPercentage = mapping.thresholdPercentage;
    this.publish({
      mappings: this.snapshot.mappings.map((candidate) =>
        candidate.id === mappingId ? { ...candidate, thresholdPercentage } : candidate,
      ),
      thresholdSaveStates: {
        ...this.snapshot.thresholdSaveStates,
        [mappingId]: "saving",
      },
    });

    try {
      await updateMovementMappingThreshold(mappingId, this.presetId, thresholdPercentage);
      if (this.thresholdOperationTokens.get(mappingId) !== token) return true;
      this.publishThresholdState(mappingId, "saved");
      return true;
    } catch (error) {
      if (this.thresholdOperationTokens.get(mappingId) !== token) return false;
      console.error("Failed to update movement threshold", error);
      this.publish({
        mappings: this.snapshot.mappings.map((candidate) =>
          candidate.id === mappingId
            ? { ...candidate, thresholdPercentage: previousPercentage }
            : candidate,
        ),
        thresholdSaveStates: {
          ...this.snapshot.thresholdSaveStates,
          [mappingId]: "error",
        },
      });
      return false;
    }
  };

  private publishThresholdState(
    mappingId: string,
    state: PresetMappingsSnapshot["thresholdSaveStates"][string],
  ) {
    this.publish({
      thresholdSaveStates: {
        ...this.snapshot.thresholdSaveStates,
        [mappingId]: state,
      },
    });
  }

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
    thresholdSaveStates: {},
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
