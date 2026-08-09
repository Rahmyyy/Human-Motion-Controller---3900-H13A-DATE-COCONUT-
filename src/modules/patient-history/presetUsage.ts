import type { PatientSession, PresetUsage, PresetUsageSlice } from "./types";

export const OTHER_PRESETS_KEY = "other";

/**
 * Coloured slices are capped at three. The palette's fourth and fifth entries are reserved for
 * the threshold chart's lines, where they only ever sit beside their immediate neighbours; in a
 * donut every wedge borders every other, and at four the light-mode pair chart-2/chart-4 stops
 * being reliably distinguishable.
 */
export const MAX_PRESET_SLICES = 3;

interface PresetTally {
  id: string;
  name: string;
  sessionCount: number;
  mappingIds: Set<string>;
}

export function buildPresetUsage(sessions: PatientSession[]): PresetUsage {
  const tallies = tallyPresets(sessions);

  if (tallies.length === 0) {
    return {
      slices: [],
      topPresetName: null,
      topPresetSessionCount: 0,
      topPresetMappingCount: 0,
    };
  }

  const [top] = tallies;
  const named = tallies.slice(0, MAX_PRESET_SLICES);
  const remainder = tallies.slice(MAX_PRESET_SLICES);
  const otherCount = remainder.reduce((total, tally) => total + tally.sessionCount, 0);

  const counts = named.map((tally) => tally.sessionCount);
  // The mockup shows an "Other presets — 0 (0%)" row beside a 100% preset. A zero-session slice
  // cannot occupy any arc, so it is only rendered when it actually holds sessions.
  if (otherCount > 0) counts.push(otherCount);
  const percentages = wholePercentages(counts);

  const slices: PresetUsageSlice[] = named.map((tally, index) => ({
    key: tally.id,
    label: tally.name,
    sessionCount: tally.sessionCount,
    percentage: percentages[index] ?? 0,
    colorIndex: index,
  }));

  if (otherCount > 0) {
    slices.push({
      key: OTHER_PRESETS_KEY,
      label: "Other presets",
      sessionCount: otherCount,
      percentage: percentages[named.length] ?? 0,
      colorIndex: null,
    });
  }

  return {
    slices,
    topPresetName: top?.name ?? null,
    topPresetSessionCount: top?.sessionCount ?? 0,
    topPresetMappingCount: top?.mappingIds.size ?? 0,
  };
}

/** Groups by preset snapshot id, most-used first, keeping the latest name snapshot. */
function tallyPresets(sessions: PatientSession[]): PresetTally[] {
  const tallies = new Map<string, PresetTally>();

  // Sessions arrive newest first, so the first name seen for a preset is its latest.
  for (const session of sessions) {
    const tally = tallies.get(session.presetId) ?? {
      id: session.presetId,
      name: session.presetName,
      sessionCount: 0,
      mappingIds: new Set<string>(),
    };
    tally.sessionCount += 1;
    // Counted from the snapshots so the figure survives the preset being deleted.
    for (const mapping of session.mappings) tally.mappingIds.add(mapping.mappingId);
    tallies.set(session.presetId, tally);
  }

  return [...tallies.values()].sort(
    (left, right) => right.sessionCount - left.sessionCount || left.name.localeCompare(right.name),
  );
}

/**
 * Whole percentages that sum to exactly 100, by largest remainder. Rounding each share
 * independently gives three equal presets 33% each and a legend that visibly adds up to 99.
 */
function wholePercentages(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return counts.map(() => 0);

  const exact = counts.map((count) => (count / total) * 100);
  const floors = exact.map(Math.floor);
  let remaining = 100 - floors.reduce((sum, value) => sum + value, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder);

  for (const { index } of byRemainder) {
    if (remaining <= 0) break;
    floors[index] += 1;
    remaining -= 1;
  }

  return floors;
}
