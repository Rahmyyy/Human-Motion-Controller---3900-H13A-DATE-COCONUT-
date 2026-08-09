import {
  ALL_PRESETS,
  type DateRangeOption,
  type HistoryFilter,
  type PatientSession,
  type PresetFilterOption,
} from "./types";

export const DATE_RANGE_LABELS: Record<DateRangeOption, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

const DAYS_IN_RANGE: Record<Exclude<DateRangeOption, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * Local midnight at the start of the range, or null for all time.
 *
 * Calendar-aligned rather than a rolling `now - 30 days`: with a rolling window, a session
 * recorded thirty days and twenty minutes ago drops out of "Last 30 days" partway through the
 * afternoon, which reads as data going missing.
 */
export function dateRangeStartMs(range: DateRangeOption, nowMs: number): number | null {
  if (range === "all") return null;

  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);
  // The range includes today, so a 7-day range reaches back six further days.
  start.setDate(start.getDate() - (DAYS_IN_RANGE[range] - 1));
  return start.getTime();
}

export function filterSessions(
  sessions: PatientSession[],
  filter: HistoryFilter,
  nowMs: number,
): PatientSession[] {
  const startMs = dateRangeStartMs(filter.dateRange, nowMs);

  return sessions.filter((session) => {
    if (startMs !== null && session.startedAtMs < startMs) return false;
    return filter.presetId === ALL_PRESETS || session.presetId === filter.presetId;
  });
}

/**
 * "All presets", then one option per preset the patient has actually used, most used first.
 * Keyed by preset id so two presets sharing a name stay separate, and labelled with the most
 * recent name snapshot so a rename shows through.
 */
export function presetFilterOptions(sessions: PatientSession[]): PresetFilterOption[] {
  const options = new Map<string, PresetFilterOption>();

  // Sessions arrive newest first, so the first name seen for a preset is its latest.
  for (const session of sessions) {
    const existing = options.get(session.presetId);
    if (existing) {
      existing.sessionCount += 1;
      continue;
    }
    options.set(session.presetId, {
      id: session.presetId,
      name: session.presetName,
      sessionCount: 1,
    });
  }

  const used = [...options.values()].sort(
    (left, right) => right.sessionCount - left.sessionCount || left.name.localeCompare(right.name),
  );

  return [{ id: ALL_PRESETS, name: "All presets", sessionCount: sessions.length }, ...used];
}
