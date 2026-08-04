import { getMovementMappings } from "@/modules/movement-mapping";
import { getPatient, getPreset } from "@/modules/patient-presets";
import type { SessionSummary, SummaryContextLoader, SummaryContextSnapshot } from "./types";

interface SummaryDependencies {
  getPatient: typeof getPatient;
  getPreset: typeof getPreset;
  getMappings: typeof getMovementMappings;
}

const realDependencies: SummaryDependencies = {
  getPatient,
  getPreset,
  getMappings: getMovementMappings,
};

class CompletedSessionContext implements SummaryContextLoader {
  private snapshot: SummaryContextSnapshot = {
    context: null,
    isLoading: true,
    loadError: null,
  };
  private readonly listeners = new Set<() => void>();
  private operationToken = 0;

  constructor(private readonly dependencies: SummaryDependencies) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async (patientId: string, presetId: string, summary: SessionSummary) => {
    const token = ++this.operationToken;
    this.publish({ context: null, isLoading: true, loadError: null });
    try {
      const [patient, preset, mappings] = await Promise.all([
        this.dependencies.getPatient(patientId),
        this.dependencies.getPreset(presetId, patientId),
        this.dependencies.getMappings(presetId),
      ]);
      if (token !== this.operationToken) return;
      this.publish({
        context: {
          patientName: patient.displayName,
          presetName: preset.name,
          rows: mappings.map((mapping) => ({
            id: mapping.id,
            name: mapping.name,
            keybind: mapping.keybind,
            triggerCount: summary.triggerCountsByMapping[mapping.id] ?? 0,
          })),
        },
        isLoading: false,
        loadError: null,
      });
    } catch (error) {
      if (token !== this.operationToken) return;
      this.publish({
        context: null,
        isLoading: false,
        loadError: errorMessage(error),
      });
    }
  };

  dispose = () => {
    ++this.operationToken;
  };

  private publish(snapshot: SummaryContextSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const createSummaryContextLoader = (): SummaryContextLoader =>
  new CompletedSessionContext(realDependencies);

export const createSummaryContextLoaderWithDependencies = (
  dependencies: SummaryDependencies,
): SummaryContextLoader => new CompletedSessionContext(dependencies);
