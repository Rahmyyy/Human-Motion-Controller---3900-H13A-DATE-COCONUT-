import { formatAxisDate, formatSessionTimestamp } from "./formatting";
import type { PatientSession, ThresholdMapping, ThresholdPoint, ThresholdSeries } from "./types";

/** The palette holds five entries; a sixth line would have no colour of its own. */
export const MAX_THRESHOLD_SERIES = 5;

/** Matches the activity chart's window, so the two panels always cover the same sessions. */
export const MAX_THRESHOLD_POINTS = 30;

const MIN_Y_SPAN = 20;
const AXIS_STEP = 10;

interface MappingTally {
  id: string;
  name: string;
  presetName: string;
  triggerCount: number;
}

/**
 * The mappings that get a line, in palette order.
 *
 * Computed separately from the points so the caller can derive the order from the
 * preset-filtered sessions and then plot a narrower date range against it. Ranking inside
 * `buildThresholdSeries` would let a date change re-rank the survivors and repaint every line,
 * making a filter adjustment look like a change in the data.
 */
export function orderThresholdMappings(sessions: PatientSession[]): ThresholdMapping[] {
  const tallies = new Map<string, MappingTally>();

  // Sessions arrive newest first, so the first name seen for a mapping is its latest.
  for (const session of sessions) {
    for (const mapping of session.mappings) {
      const tally = tallies.get(mapping.mappingId) ?? {
        id: mapping.mappingId,
        name: mapping.mappingName,
        presetName: session.presetName,
        triggerCount: 0,
      };
      tally.triggerCount += mapping.triggerCount;
      tallies.set(mapping.mappingId, tally);
    }
  }

  const ranked = [...tallies.values()]
    .sort(
      (left, right) =>
        right.triggerCount - left.triggerCount || left.name.localeCompare(right.name),
    )
    .slice(0, MAX_THRESHOLD_SERIES);

  const duplicatedNames = new Set(
    ranked.map((tally) => tally.name).filter((name, index, names) => names.indexOf(name) !== index),
  );

  return ranked.map((tally, index) => ({
    id: tally.id,
    // A synthetic key, because mapping ids are arbitrary strings and the chart interpolates
    // this into a CSS custom property name.
    seriesKey: `mapping${index}`,
    label: duplicatedNames.has(tally.name) ? `${tally.name} (${tally.presetName})` : tally.name,
    colorIndex: index,
  }));
}

export function buildThresholdSeries(
  sessions: PatientSession[],
  mappings: ThresholdMapping[],
): ThresholdSeries {
  const oldestFirst = [...sessions].reverse();
  const plotted = oldestFirst.slice(-MAX_THRESHOLD_POINTS);

  const points: ThresholdPoint[] = plotted.map((session) => {
    const thresholds = new Map(
      session.mappings.map((mapping) => [mapping.mappingId, mapping.thresholdPercentage]),
    );

    return {
      sessionId: session.id,
      axisLabel: formatAxisDate(session.startedAtMs),
      tooltipLabel: `${formatSessionTimestamp(session.startedAtMs)} · ${session.presetName}`,
      values: Object.fromEntries(
        // A mapping absent from a session means a different preset ran, not that the mapping
        // stopped existing. Null leaves the gap unobserved for the chart to bridge.
        mappings.map((mapping) => [mapping.seriesKey, thresholds.get(mapping.id) ?? null]),
      ),
    };
  });

  return {
    mappings,
    points,
    yDomain: thresholdDomain(points, mappings),
    truncatedFrom: oldestFirst.length > plotted.length ? oldestFirst.length : null,
  };
}

/**
 * Ticks snapped outward to a multiple of ten within 0–100, widened to a minimum span so a run
 * of identical thresholds still draws a line rather than collapsing onto the axis.
 */
function thresholdDomain(points: ThresholdPoint[], mappings: ThresholdMapping[]): [number, number] {
  const observed = points.flatMap((point) =>
    mappings
      .map((mapping) => point.values[mapping.seriesKey])
      .filter((value): value is number => value !== null && value !== undefined),
  );

  if (observed.length === 0) return [0, 100];

  let low = Math.floor(Math.min(...observed) / AXIS_STEP) * AXIS_STEP;
  let high = Math.ceil(Math.max(...observed) / AXIS_STEP) * AXIS_STEP;

  while (high - low < MIN_Y_SPAN) {
    if (low > 0) low -= AXIS_STEP;
    else if (high < 100) high += AXIS_STEP;
    else break;
  }

  return [Math.max(0, low), Math.min(100, high)];
}
