import { describe, expect, it } from "vitest";
import { sessionTracker } from "./index";

describe("the shared session tracker", () => {
  /** One tracker is shared so the overlay's panels all read the same running session. */
  it("is ready to time a session, with none under way", () => {
    expect(sessionTracker.getSnapshot()).toMatchObject({ status: "idle", elapsedMs: 0 });
  });
});
