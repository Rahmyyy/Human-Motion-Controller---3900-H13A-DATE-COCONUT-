/**
 * TEMPORARY SCAFFOLDING: stand-in for a real cross-page session/trigger event
 * system. The recognition page (which fires key presses) and the dashboard
 * (which shows session state and trigger counts) are separate routes with no
 * shared state today. This tiny external store bridges them until a real
 * session lifecycle exists elsewhere in the app — replace wholesale once it does.
 */
type Listener = () => void;

let isRunning = false;
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

export function getIsRunning() {
  return isRunning;
}

export function getTriggerCount() {
  return triggerCount;
}

export function startSession() {
  isRunning = true;
  triggerCount = 0;
  notify();
}

export function endSession() {
  isRunning = false;
  notify();
}

export function recordSuccessfulTrigger() {
  if (!isRunning) {
    return;
  }
  triggerCount += 1;
  notify();
}
