import { describe, expect, it } from "vitest";
import { buildSessionActivity, MAX_ACTIVITY_POINTS, summariseSessions } from "./metrics";
import { localTime, session } from "./testSessions";

describe("summariseSessions", () => {
  it("counts sessions and totals their duration and triggers", () => {
    const sessions = [
      session({ id: "a", durationMs: 756_000, triggerCount: 31 }),
      session({ id: "b", durationMs: 848_000, triggerCount: 27 }),
    ];

    expect(summariseSessions(sessions)).toEqual({
      completedSessions: 2,
      totalDurationMs: 1_604_000,
      successfulTriggers: 58,
      averageTriggersPerSession: 29,
    });
  });

  it("rounds the average triggers per session to a whole number", () => {
    const sessions = [
      session({ id: "a", triggerCount: 10 }),
      session({ id: "b", triggerCount: 11 }),
      session({ id: "c", triggerCount: 11 }),
    ];

    expect(summariseSessions(sessions).averageTriggersPerSession).toBe(11);
  });

  it("reports zeroes rather than NaN when there are no sessions", () => {
    expect(summariseSessions([])).toEqual({
      completedSessions: 0,
      totalDurationMs: 0,
      successfulTriggers: 0,
      averageTriggersPerSession: 0,
    });
  });
});

describe("buildSessionActivity", () => {
  it("plots one point per session, oldest first", () => {
    const sessions = [
      session({ id: "newest", startedAtMs: localTime(2026, 7, 4, 10, 42) }),
      session({ id: "oldest", startedAtMs: localTime(2026, 6, 24, 15, 5) }),
    ];

    const points = buildSessionActivity(sessions).points;

    expect(points.map((point) => point.sessionId)).toEqual(["oldest", "newest"]);
    expect(points.map((point) => point.axisLabel)).toEqual(["24 Jul", "4 Aug"]);
  });

  it("gives two sessions on the same day their own points under a repeated tick", () => {
    const sessions = [
      session({ id: "afternoon", startedAtMs: localTime(2026, 7, 4, 15, 5) }),
      session({ id: "morning", startedAtMs: localTime(2026, 7, 4, 9, 30) }),
    ];

    const points = buildSessionActivity(sessions).points;

    expect(points).toHaveLength(2);
    expect(points.map((point) => point.axisLabel)).toEqual(["4 Aug", "4 Aug"]);
  });

  it("distinguishes same-day points through the tooltip label", () => {
    const sessions = [
      session({ id: "afternoon", startedAtMs: localTime(2026, 7, 4, 15, 5) }),
      session({ id: "morning", startedAtMs: localTime(2026, 7, 4, 9, 30) }),
    ];

    const points = buildSessionActivity(sessions).points;

    expect(points[0]?.tooltipLabel).toBe("4 Aug 2026, 9:30 AM · mario kart");
    expect(points[1]?.tooltipLabel).toBe("4 Aug 2026, 3:05 PM · mario kart");
  });

  it("converts each session's duration to minutes for the line series", () => {
    const points = buildSessionActivity([session({ durationMs: 756_000 })]).points;

    expect(points[0]?.durationMinutes).toBe(12.6);
  });

  it("plots only the most recent sessions once past the cap", () => {
    const sessions = Array.from({ length: MAX_ACTIVITY_POINTS + 5 }, (_, index) =>
      session({ id: `session-${index}`, startedAtMs: localTime(2026, 7, 4) - index * 86_400_000 }),
    );

    const activity = buildSessionActivity(sessions);

    expect(activity.points).toHaveLength(MAX_ACTIVITY_POINTS);
    expect(activity.points[MAX_ACTIVITY_POINTS - 1]?.sessionId).toBe("session-0");
    expect(activity.truncatedFrom).toBe(MAX_ACTIVITY_POINTS + 5);
  });

  it("does not report truncation when every session is plotted", () => {
    expect(buildSessionActivity([session()]).truncatedFrom).toBeNull();
  });

  it("plots nothing for no sessions", () => {
    expect(buildSessionActivity([]).points).toEqual([]);
  });
});
