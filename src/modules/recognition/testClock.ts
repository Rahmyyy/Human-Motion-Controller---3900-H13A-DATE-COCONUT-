import type { RecognitionClock } from "./types";

/** A clock the test winds by hand, so throttling and feedback windows are exact, not timed. */
export function createClockStub(startMs = 0) {
  const timers = new Map<number, { at: number; callback: () => void }>();
  let now = startMs;
  let nextHandle = 1;

  const clock: RecognitionClock = {
    now: () => now,
    setTimeout(callback, delayMs) {
      const handle = nextHandle++;
      timers.set(handle, { at: now + delayMs, callback });
      return handle;
    },
    clearTimeout(handle) {
      timers.delete(handle as number);
    },
  };

  return {
    clock,
    advance(ms: number) {
      now += ms;
      for (const [handle, timer] of [...timers]) {
        if (timer.at > now) continue;
        timers.delete(handle);
        timer.callback();
      }
    },
    get pendingTimers() {
      return timers.size;
    },
  };
}

/** Lets any already-resolved trigger promises settle before the test looks at the snapshot. */
export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
