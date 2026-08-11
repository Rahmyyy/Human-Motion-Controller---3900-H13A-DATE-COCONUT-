import type { SessionClock } from "./types";

/** A wall clock the test winds by hand, so elapsed times are exact rather than timed. */
export function createSessionClockStub(startMs = 0) {
  const intervals = new Map<number, () => void>();
  let now = startMs;
  let nextHandle = 1;

  const clock: SessionClock = {
    now: () => now,
    setInterval(callback) {
      const handle = nextHandle++;
      intervals.set(handle, callback);
      return handle;
    },
    clearInterval(handle) {
      intervals.delete(handle as number);
    },
  };

  return {
    clock,
    /** Moves time on and lets the elapsed-time ticker catch up, as a real interval would. */
    advance(ms: number) {
      now += ms;
      intervals.forEach((callback) => callback());
    },
    get tickerCount() {
      return intervals.size;
    },
  };
}
