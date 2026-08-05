import { getPatient } from "@/modules/patient-presets";
import { getPatientSessions } from "./adapters/tauriPatientHistory";
import { filterSessions, presetFilterOptions } from "./filtering";
import { buildSessionActivity, summariseSessions } from "./metrics";
import { buildPresetUsage } from "./presetUsage";
import { buildThresholdSeries, orderThresholdMappings } from "./thresholdSeries";
import {
  ALL_PRESETS,
  type DateRangeOption,
  type HistoryFilter,
  type PatientHistory,
  type PatientHistorySnapshot,
  type PatientSession,
} from "./types";

interface PatientHistoryDependencies {
  loadSessions: (patientId: string) => Promise<PatientSession[]>;
  loadPatient: (patientId: string) => Promise<{ displayName: string }>;
  now: () => number;
}

const realDependencies: PatientHistoryDependencies = {
  loadSessions: getPatientSessions,
  loadPatient: getPatient,
  now: () => Date.now(),
};

class NativePatientHistory implements PatientHistory {
  private snapshot: PatientHistorySnapshot = emptySnapshot();
  private readonly listeners = new Set<() => void>();
  private operationToken = 0;
  private patientId: string | null = null;
  private allSessions: PatientSession[] = [];
  /**
   * Captured once per load. Filtering against a live clock would let the same data move in and
   * out of range between renders as the day rolls over mid-session.
   */
  private loadedAtMs = 0;

  constructor(private readonly dependencies: PatientHistoryDependencies) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async (patientId: string | undefined) => {
    const token = ++this.operationToken;
    this.patientId = patientId ?? null;

    if (!patientId) {
      this.publish({ ...emptySnapshot(), isLoading: false, error: "Patient not found." });
      return;
    }

    this.publish({ ...emptySnapshot(), filter: this.snapshot.filter, isLoading: true });

    // Settled rather than all: the charts are readable without the patient's name, so a failed
    // name lookup must not blank them.
    const [sessions, patient] = await Promise.allSettled([
      this.dependencies.loadSessions(patientId),
      this.dependencies.loadPatient(patientId),
    ]);
    if (token !== this.operationToken) return;

    this.loadedAtMs = this.dependencies.now();
    this.allSessions = sessions.status === "fulfilled" ? sessions.value : [];

    if (sessions.status === "rejected") {
      console.error("Failed to load patient history", sessions.reason);
    }

    this.publish({
      ...this.derive(this.snapshot.filter),
      error: sessions.status === "rejected" ? "Could not load this patient's history." : null,
      isLoading: false,
      patientName: patient.status === "fulfilled" ? patient.value.displayName : null,
    });
  };

  retry = () => this.start(this.patientId ?? undefined);

  dispose = () => {
    ++this.operationToken;
  };

  setDateRange = (dateRange: DateRangeOption) => this.applyFilter({ dateRange });

  setPresetId = (presetId: string) => this.applyFilter({ presetId });

  /** One publish per filter change, so the page re-renders once rather than twice. */
  private applyFilter(change: Partial<HistoryFilter>) {
    const filter = { ...this.snapshot.filter, ...change };
    this.publish({ filter, ...this.derive(filter) });
  }

  /** Recomputes every panel from the loaded sessions and the given filter. */
  private derive(filter: HistoryFilter) {
    const datelessFilter = { dateRange: "all" as const, presetId: filter.presetId };
    const inPreset = filterSessions(this.allSessions, datelessFilter, this.loadedAtMs);
    const sessions = filterSessions(this.allSessions, filter, this.loadedAtMs);

    return {
      presetOptions: presetFilterOptions(this.allSessions),
      totalSessionCount: this.allSessions.length,
      sessions,
      summary: summariseSessions(sessions),
      activity: buildSessionActivity(sessions),
      presetUsage: buildPresetUsage(sessions),
      // Ordered from the date-unfiltered set so narrowing the range never repaints a line.
      thresholds: buildThresholdSeries(sessions, orderThresholdMappings(inPreset)),
    };
  }

  private publish(update: Partial<PatientHistorySnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.listeners.forEach((listener) => listener());
  }
}

function emptySnapshot(): PatientHistorySnapshot {
  return {
    error: null,
    isLoading: true,
    patientName: null,
    filter: { dateRange: "30d", presetId: ALL_PRESETS },
    presetOptions: [],
    totalSessionCount: 0,
    sessions: [],
    summary: summariseSessions([]),
    activity: buildSessionActivity([]),
    presetUsage: buildPresetUsage([]),
    thresholds: buildThresholdSeries([], []),
  };
}

export const createPatientHistory = (): PatientHistory =>
  new NativePatientHistory(realDependencies);

export const createPatientHistoryWithDependencies = (
  dependencies: PatientHistoryDependencies,
): PatientHistory => new NativePatientHistory(dependencies);
