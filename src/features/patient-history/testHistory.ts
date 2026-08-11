import type {
  PatientSession,
  PresetUsage,
  SessionActivity,
  SessionMappingStat,
  ThresholdSeries,
} from "@/modules/patient-history";

export const mappingStat = (overrides: Partial<SessionMappingStat> = {}): SessionMappingStat => ({
  mappingId: "mapping-1",
  mappingName: "Left arm raise",
  keybind: "A",
  thresholdPercentage: 70,
  keypressTriggerThresholdPercentage: 60,
  triggerCount: 4,
  ...overrides,
});

export const session = (overrides: Partial<PatientSession> = {}): PatientSession => ({
  id: "session-1",
  presetId: "preset-1",
  presetName: "Mario Kart",
  startedAtMs: new Date(2026, 7, 4, 10, 42).getTime(),
  durationMs: 756_000,
  triggerCount: 12,
  mappings: [mappingStat()],
  ...overrides,
});

export const activity = (overrides: Partial<SessionActivity> = {}): SessionActivity => ({
  points: [
    {
      sessionId: "session-1",
      axisLabel: "4 Aug",
      tooltipLabel: "4 Aug 2026, 10:42 AM · Mario Kart",
      triggerCount: 12,
      durationMinutes: 12.6,
    },
  ],
  truncatedFrom: null,
  ...overrides,
});

export const presetUsage = (overrides: Partial<PresetUsage> = {}): PresetUsage => ({
  slices: [
    { key: "preset-1", label: "Mario Kart", sessionCount: 3, percentage: 75, colorIndex: 0 },
    { key: "other", label: "Other presets", sessionCount: 1, percentage: 25, colorIndex: null },
  ],
  topPresetName: "Mario Kart",
  topPresetSessionCount: 3,
  topPresetMappingCount: 2,
  ...overrides,
});

export const thresholdSeries = (overrides: Partial<ThresholdSeries> = {}): ThresholdSeries => ({
  mappings: [{ id: "mapping-1", seriesKey: "mapping_1", label: "Left arm raise", colorIndex: 0 }],
  points: [
    {
      sessionId: "session-1",
      axisLabel: "4 Aug",
      tooltipLabel: "4 Aug 2026, 10:42 AM · Mario Kart",
      values: { mapping_1: 70 },
    },
  ],
  yDomain: [0, 100],
  truncatedFrom: null,
  ...overrides,
});
