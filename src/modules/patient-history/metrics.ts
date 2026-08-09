import { formatAxisDate, formatSessionTimestamp, toDurationMinutes } from "./formatting";
import type { HistorySummary, PatientSession, SessionActivity } from "./types";

/** "All time" is unbounded, so the chart plots the most recent window and says so. */
export const MAX_ACTIVITY_POINTS = 30;

export function summariseSessions(sessions: PatientSession[]): HistorySummary {
  const totalDurationMs = sessions.reduce((total, session) => total + session.durationMs, 0);
  const successfulTriggers = sessions.reduce((total, session) => total + session.triggerCount, 0);

  return {
    completedSessions: sessions.length,
    totalDurationMs,
    successfulTriggers,
    // Guarded rather than left as NaN: an empty range still renders these cards.
    averageTriggersPerSession:
      sessions.length === 0 ? 0 : Math.round(successfulTriggers / sessions.length),
  };
}

/**
 * One point per session, oldest first.
 *
 * Deliberately not aggregated per day. The stat card claims a session count, and one bar per
 * session is a claim the reader can check against it; merging two sessions on one Tuesday would
 * show fewer bars than the card counts. The line is also a *duration* — per day it would have to
 * become a sum or a mean, neither of which answers "how long was that session".
 */
export function buildSessionActivity(sessions: PatientSession[]): SessionActivity {
  const oldestFirst = [...sessions].reverse();
  const plotted = oldestFirst.slice(-MAX_ACTIVITY_POINTS);

  return {
    points: plotted.map((session) => ({
      sessionId: session.id,
      axisLabel: formatAxisDate(session.startedAtMs),
      // Same-day sessions share an axis tick, so the tooltip carries the time and preset.
      tooltipLabel: `${formatSessionTimestamp(session.startedAtMs)} · ${session.presetName}`,
      triggerCount: session.triggerCount,
      durationMinutes: toDurationMinutes(session.durationMs),
    })),
    truncatedFrom: oldestFirst.length > plotted.length ? oldestFirst.length : null,
  };
}
