import type { PatientSession, SessionMappingStat } from "./types";

/** Local-time builder so date assertions hold in any timezone. */
export const localTime = (
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
): number => new Date(year, monthIndex, day, hours, minutes).getTime();

export function mappingStat(overrides: Partial<SessionMappingStat> = {}): SessionMappingStat {
  return {
    mappingId: "mapping-1",
    mappingName: "Accelerate",
    keybind: "W",
    thresholdPercentage: 60,
    keypressTriggerThresholdPercentage: 60,
    triggerCount: 10,
    ...overrides,
  };
}

export function session(overrides: Partial<PatientSession> = {}): PatientSession {
  return {
    id: "session-1",
    presetId: "preset-1",
    presetName: "mario kart",
    startedAtMs: localTime(2026, 7, 4, 10, 42),
    durationMs: 756_000,
    triggerCount: 31,
    mappings: [mappingStat()],
    ...overrides,
  };
}
