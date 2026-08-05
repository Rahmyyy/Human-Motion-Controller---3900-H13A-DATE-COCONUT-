import type { CompletedSession, SessionSnapshot } from "./types";

export interface SessionIdentity {
  patientId: string | null;
  presetId: string | null;
  sessionId: string | null;
}

/**
 * Builds the history record for a session that just ended, or null when there is nothing
 * worth recording — a session that failed to start, or one whose overlay never learned which
 * patient and preset it was running. History only holds sessions that actually ran.
 */
export function toCompletedSession(
  identity: SessionIdentity,
  snapshot: SessionSnapshot | null,
): CompletedSession | null {
  const { patientId, presetId, sessionId } = identity;
  if (!patientId || !presetId || !sessionId) return null;
  if (!snapshot || snapshot.status !== "ended") return null;
  if (snapshot.startedAt === null || snapshot.endedAt === null) return null;

  return {
    sessionId,
    patientId,
    presetId,
    startedAtMs: snapshot.startedAt,
    endedAtMs: snapshot.endedAt,
    triggerCountsByMapping: snapshot.triggerCountsByMapping,
  };
}
