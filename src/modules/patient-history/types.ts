/** One mapping's frozen settings and activity within a completed session. */
export interface SessionMappingStat {
  mappingId: string;
  mappingName: string;
  keybind: string;
  /** Range-of-motion completion required, the value the threshold chart plots. */
  thresholdPercentage: number;
  /** Match confidence required before the keypress fires. Shown in tooltips only. */
  keypressTriggerThresholdPercentage: number;
  triggerCount: number;
}

/** A session this patient completed. */
export interface PatientSession {
  id: string;
  presetId: string;
  presetName: string;
  startedAtMs: number;
  durationMs: number;
  triggerCount: number;
  mappings: SessionMappingStat[];
}

export const DATE_RANGE_OPTIONS = ["7d", "30d", "90d", "all"] as const;

export type DateRangeOption = (typeof DATE_RANGE_OPTIONS)[number];

export const ALL_PRESETS = "all";

export interface HistoryFilter {
  dateRange: DateRangeOption;
  presetId: string;
}

export interface PresetFilterOption {
  id: string;
  name: string;
  sessionCount: number;
}

export interface HistorySummary {
  completedSessions: number;
  totalDurationMs: number;
  successfulTriggers: number;
  averageTriggersPerSession: number;
}

export interface SessionActivityPoint {
  sessionId: string;
  /** Short date for the axis tick, e.g. "4 Aug". Repeats for same-day sessions. */
  axisLabel: string;
  /** Full timestamp and preset, so same-day points stay distinguishable. */
  tooltipLabel: string;
  triggerCount: number;
  durationMinutes: number;
}

export interface SessionActivity {
  /** Oldest to newest, so the chart reads left to right. */
  points: SessionActivityPoint[];
  /** Total sessions before the cap, when more were available than are plotted. */
  truncatedFrom: number | null;
}

export interface PresetUsageSlice {
  /** Preset snapshot id, or `OTHER_PRESETS_KEY` for the folded remainder. */
  key: string;
  label: string;
  sessionCount: number;
  /** Whole percentages that sum to exactly 100. */
  percentage: number;
  /** Index into the chart palette; null renders muted. */
  colorIndex: number | null;
}

export interface PresetUsage {
  slices: PresetUsageSlice[];
  topPresetName: string | null;
  topPresetSessionCount: number;
  topPresetMappingCount: number;
}

export interface ThresholdMapping {
  /** Mapping snapshot id — the identity a line follows across renames. */
  id: string;
  /** CSS-custom-property-safe key the chart binds a colour and a series to. */
  seriesKey: string;
  label: string;
  colorIndex: number;
}

/** One session's column in the threshold chart. Series values are null where unobserved. */
export interface ThresholdPoint {
  sessionId: string;
  axisLabel: string;
  tooltipLabel: string;
  values: Record<string, number | null>;
}

export interface ThresholdSeries {
  mappings: ThresholdMapping[];
  points: ThresholdPoint[];
  yDomain: [number, number];
  truncatedFrom: number | null;
}

export interface PatientHistorySnapshot {
  /** Every panel reads one request, so they share one loading and error state. */
  error: string | null;
  isLoading: boolean;
  /** Loaded separately, so a failed name never blanks the charts. */
  patientName: string | null;
  filter: HistoryFilter;
  presetOptions: PresetFilterOption[];
  /** Pre-filter count, so "no history yet" is distinguishable from "none in range". */
  totalSessionCount: number;
  /** Filtered, newest first — what the table renders. */
  sessions: PatientSession[];
  summary: HistorySummary;
  activity: SessionActivity;
  presetUsage: PresetUsage;
  thresholds: ThresholdSeries;
}

export interface PatientHistory {
  getSnapshot(): PatientHistorySnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string | undefined): Promise<void>;
  dispose(): void;
  setDateRange(range: DateRangeOption): void;
  setPresetId(presetId: string): void;
  retry(): Promise<void>;
}
