/**
 * TEMPORARY SCAFFOLDING: stand-in for a real cross-page session/trigger event
 * system. The recognition page (which fires key presses) and the dashboard
 * (which shows session state and trigger counts) are separate routes with no
 * shared state today. This tiny external store bridges them until a real
 * session lifecycle exists elsewhere in the app — replace wholesale once it does.
 */
export type SessionStatus = "idle" | "running" | "ended";

type Listener = () => void;

let status: SessionStatus = "idle";
let startedAt: number | null = null;
let endedAt: number | null = null;
let triggerCount = 0;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionStatus() {
  return status;
}

export function getStartedAt() {
  return startedAt;
}

export function getEndedAt() {
  return endedAt;
}

export function getTriggerCount() {
  return triggerCount;
}

/**
 * Derives elapsed duration from timestamps rather than an accumulated
 * counter, so any component can compute the correct value at any time
 * regardless of when it mounted.
 */
export function getElapsedMs(
  sessionStatus: SessionStatus,
  sessionStartedAt: number | null,
  sessionEndedAt: number | null,
) {
  if (sessionStatus === "idle" || sessionStartedAt === null) {
    return 0;
  }
  if (sessionStatus === "ended") {
    return (sessionEndedAt ?? sessionStartedAt) - sessionStartedAt;
  }
  return Date.now() - sessionStartedAt;
}

export function startSession() {
  status = "running";
  startedAt = Date.now();
  endedAt = null;
  triggerCount = 0;
  notify();
}

export function endSession() {
  status = "ended";
  endedAt = Date.now();
  notify();
}

export function recordSuccessfulTrigger() {
  if (status !== "running") {
    return;
  }
  triggerCount += 1;
  notify();
}
