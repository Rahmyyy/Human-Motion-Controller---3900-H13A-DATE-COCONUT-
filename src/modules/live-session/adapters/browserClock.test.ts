import { afterEach, describe, expect, it, vi } from "vitest";
import { browserRecognitionClock, browserSessionClock } from "./browserClock";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("browserRecognitionClock", () => {
  /** Recognition throttling measures gaps, so it reads the monotonic clock, not the date. */
  it("reads the time from the browser's monotonic clock", () => {
    vi.spyOn(performance, "now").mockReturnValue(1234);

    expect(browserRecognitionClock.now()).toBe(1234);
  });

  it("schedules and cancels work through the window's timers", () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const handle = browserRecognitionClock.setTimeout(callback, 100);
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);

    const cancelled = browserRecognitionClock.setTimeout(callback, 100);
    browserRecognitionClock.clearTimeout(cancelled);
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(handle).not.toBe(cancelled);
  });
});

describe("browserSessionClock", () => {
  /** A session's start and end are wall-clock times, so they survive into the patient's history. */
  it("reads the time from the wall clock", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_754_000_000_000);

    expect(browserSessionClock.now()).toBe(1_754_000_000_000);
  });

  it("repeats and cancels work through the window's timers", () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const handle = browserSessionClock.setInterval(callback, 1000);
    vi.advanceTimersByTime(2000);
    expect(callback).toHaveBeenCalledTimes(2);

    browserSessionClock.clearInterval(handle);
    vi.advanceTimersByTime(2000);

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
