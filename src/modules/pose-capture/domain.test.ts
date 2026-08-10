import { describe, expect, it } from "vitest";
import { TRACKED_LANDMARKS, resolveActiveLandmarks } from "./domain";

describe("resolveActiveLandmarks", () => {
  it("keeps the selected joints in the canonical tracked order", () => {
    expect(resolveActiveLandmarks([16, 11, 15])).toEqual([11, 15, 16]);
  });

  it("ignores joints that are not tracked", () => {
    expect(resolveActiveLandmarks([15, 16, 0, 99])).toEqual([15, 16]);
  });

  it("falls back to every joint when nothing is selected", () => {
    expect(resolveActiveLandmarks([])).toEqual([...TRACKED_LANDMARKS]);
    expect(resolveActiveLandmarks(undefined)).toEqual([...TRACKED_LANDMARKS]);
    expect(resolveActiveLandmarks(null)).toEqual([...TRACKED_LANDMARKS]);
  });

  /** A legacy selection naming only untracked joints must not leave recognition with nothing. */
  it("falls back to every joint when no selected joint is tracked", () => {
    expect(resolveActiveLandmarks([0, 1, 2])).toEqual([...TRACKED_LANDMARKS]);
  });

  it("hands back a copy rather than the shared constant", () => {
    expect(resolveActiveLandmarks([])).not.toBe(TRACKED_LANDMARKS);
  });
});
