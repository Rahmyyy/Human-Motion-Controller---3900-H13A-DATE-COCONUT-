import { getPreset, type Preset } from "@/modules/patient-presets";
import { movementThresholdSettings } from "./analysis";
import { deserializeMappingPoseFrames } from "./serialization";
import type {
  MappingCollection,
  MappingCollectionSnapshot,
  MovementMappingRepository,
} from "./types";

type PresetLoader = (id: string, patientId: string) => Promise<Preset>;

class PresetMappingCollection implements MappingCollection {
  private snapshot: MappingCollectionSnapshot = emptySnapshot();
  private readonly listeners = new Set<() => void>();
  private presetId: string | null = null;
  private operationToken = 0;
  private readonly thresholdOperationTokens = new Map<string, number>();

  constructor(
    private readonly repository: MovementMappingRepository,
    private readonly loadPreset: PresetLoader,
  ) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
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
        this.loadPreset(presetId, patientId),
        this.repository.list(presetId),
      ]);
      if (token !== this.operationToken) return;
      this.publish({
        isLoading: false,
        mappings: mappings.map((mapping) => ({
          ...mapping,
          poseFrames: deserializeMappingPoseFrames(mapping.poseFramesJson),
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
      await this.repository.delete(mappingId, this.presetId);
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
      await this.repository.updateThreshold(mappingId, this.presetId, thresholdPercentage);
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
    state: MappingCollectionSnapshot["thresholdSaveStates"][string],
  ) {
    this.publish({
      thresholdSaveStates: { ...this.snapshot.thresholdSaveStates, [mappingId]: state },
    });
  }

  private publish(update: Partial<MappingCollectionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

function emptySnapshot(): MappingCollectionSnapshot {
  return {
    deletingMappingId: null,
    error: null,
    isLoading: false,
    mappings: [],
    preset: null,
    thresholdSaveStates: {},
  };
}

export function createMappingCollection(
  repository: MovementMappingRepository,
  loadPreset: PresetLoader = getPreset,
): MappingCollection {
  return new PresetMappingCollection(repository, loadPreset);
}
