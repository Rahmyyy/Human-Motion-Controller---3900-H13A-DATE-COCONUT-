import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { drawPoseFrame } from "@/features/camera/drawPoseFrame";
import PoseReplay from "./PoseReplay";
import { frame, frames } from "./testFrames";

// jsdom has no canvas 2D context, and the drawn frame is what these tests care about anyway.
vi.mock("@/features/camera/drawPoseFrame", () => ({ drawPoseFrame: vi.fn() }));

const drawn = vi.mocked(drawPoseFrame);

/** A hand-driven animation clock: frames only advance when a test says so. */
const scheduled = new Map<number, FrameRequestCallback>();
let nextHandle = 1;
let now = 0;

/** Runs the pending callback at the given time, the way the browser would on the next repaint. */
function tickTo(timeMs: number) {
  now = timeMs;
  const pending = [...scheduled.entries()];
  scheduled.clear();
  for (const [, callback] of pending) callback(timeMs);
}

/** The timestamp of the frame handed to the most recent draw. */
function lastDrawnTimestamp() {
  return drawn.mock.lastCall?.[1].timestampMs;
}

beforeEach(() => {
  scheduled.clear();
  nextHandle = 1;
  now = 0;
  vi.stubGlobal("performance", { now: () => now });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    scheduled.set(nextHandle, callback);
    return nextHandle++;
  });
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => scheduled.delete(handle));
});

afterEach(() => {
  vi.unstubAllGlobals();
  drawn.mockReset();
});

describe("PoseReplay", () => {
  it("renders a labelled canvas for the recorded movement", () => {
    render(<PoseReplay frames={frames(0, 100)} />);

    expect(screen.getByLabelText("Recorded movement replay")).toBeInstanceOf(HTMLCanvasElement);
  });

  it("draws nothing when there are no frames to replay", () => {
    render(<PoseReplay frames={[]} />);

    expect(drawn).not.toHaveBeenCalled();
    expect(scheduled.size).toBe(0);
  });

  /** Scrubbing a trim handle pins a single frame, so the loop must not fight the preview. */
  it("draws only the preview frame when one is pinned", () => {
    render(<PoseReplay frames={frames(0, 100, 200)} previewFrame={frame(100)} />);

    expect(drawn).toHaveBeenCalledOnce();
    expect(lastDrawnTimestamp()).toBe(100);
    expect(scheduled.size).toBe(0);
  });

  /** A single captured frame has no duration to loop over; it is drawn once and left there. */
  it("draws a still frame instead of animating a zero-length recording", () => {
    render(<PoseReplay frames={frames(500, 500)} />);

    expect(drawn).toHaveBeenCalledOnce();
    expect(lastDrawnTimestamp()).toBe(500);
    expect(scheduled.size).toBe(0);
  });

  it("starts an animation loop for a recording with duration", () => {
    render(<PoseReplay frames={frames(0, 100, 200)} />);

    expect(drawn).not.toHaveBeenCalled();
    expect(scheduled.size).toBe(1);
  });

  it("draws the frame nearest the elapsed time and keeps the loop running", () => {
    render(<PoseReplay frames={frames(0, 100, 200)} />);

    tickTo(90);

    expect(lastDrawnTimestamp()).toBe(100);
    expect(scheduled.size).toBe(1);
  });

  it("advances through the recording as time passes", () => {
    render(<PoseReplay frames={frames(0, 100, 200)} />);

    tickTo(10);
    expect(lastDrawnTimestamp()).toBe(0);

    tickTo(190);
    expect(lastDrawnTimestamp()).toBe(200);
  });

  /** The replay loops, so time past the end wraps back to the start rather than freezing. */
  it("wraps back to the beginning once the recording ends", () => {
    render(<PoseReplay frames={frames(0, 100, 200)} />);

    tickTo(210);

    expect(lastDrawnTimestamp()).toBe(0);
  });

  /** Recordings that do not start at zero are offset by their first timestamp, not by zero. */
  it("measures elapsed time from the first frame's timestamp", () => {
    render(<PoseReplay frames={frames(1000, 1100, 1200)} />);

    tickTo(100);

    expect(lastDrawnTimestamp()).toBe(1100);
  });

  it("stops the animation loop when unmounted", () => {
    const { unmount } = render(<PoseReplay frames={frames(0, 100, 200)} />);

    unmount();

    expect(scheduled.size).toBe(0);
  });

  /** A repaint can fire after React has detached the canvas; drawing then would throw. */
  it("skips drawing when the canvas is gone by the time the frame fires", () => {
    const { unmount } = render(<PoseReplay frames={frames(0, 100, 200)} />);
    const pending = [...scheduled.values()][0];

    unmount();
    pending(50);

    expect(drawn).not.toHaveBeenCalled();
  });

  /** Re-recording swaps the frames in place, which must restart the loop on the new data. */
  it("replays the new recording when the frames change", () => {
    const { rerender } = render(<PoseReplay frames={frames(0, 100, 200)} />);
    tickTo(10);
    expect(lastDrawnTimestamp()).toBe(0);

    rerender(<PoseReplay frames={frames(900, 1000)} />);
    tickTo(20);

    expect(lastDrawnTimestamp()).toBe(900);
  });
});
