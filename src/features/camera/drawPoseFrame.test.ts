import { describe, expect, it, vi } from "vitest";
import type { PoseFrame, PoseLandmark } from "@/modules/pose-capture";
import { drawPoseFrame } from "./drawPoseFrame";

// jsdom has no 2d rendering context, so the canvas hands back a recorder and the tests assert the
// drawing calls the overlay makes rather than the pixels it would produce.
function fakeContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: "",
    lineWidth: 0,
    strokeStyle: "",
  };
}

function setUpCanvas(context: ReturnType<typeof fakeContext> | null = fakeContext()) {
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 50;
  canvas.getContext = (() => context) as HTMLCanvasElement["getContext"];
  return { canvas, context };
}

function landmark(index: number, overrides: Partial<PoseLandmark> = {}): PoseLandmark {
  return { index, x: 0.5, y: 0.5, z: 0, visibility: 0.9, ...overrides };
}

function frameOf(...landmarks: PoseLandmark[]): PoseFrame {
  return { timestampMs: 0, landmarks };
}

/** 11 and 12 are the shoulders, the one connected pair both fixtures below share. */
const shoulders = frameOf(landmark(11, { x: 0.25 }), landmark(12, { x: 0.75 }));

describe("drawPoseFrame", () => {
  describe("canvas sizing", () => {
    it("matches the canvas to the supplied video dimensions", () => {
      const { canvas } = setUpCanvas();

      drawPoseFrame(canvas, shoulders, { width: 640, height: 480 });

      expect(canvas.width).toBe(640);
      expect(canvas.height).toBe(480);
    });

    it("leaves the canvas size alone when no dimensions are given", () => {
      const { canvas } = setUpCanvas();

      drawPoseFrame(canvas, shoulders);

      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(50);
    });
  });

  /** A context-less canvas means the browser refused the overlay; resizing already happened, so
   *  only the drawing has to be skipped. */
  it("stops before drawing when the canvas has no 2d context", () => {
    const { canvas } = setUpCanvas(null);

    expect(() => drawPoseFrame(canvas, shoulders, { width: 640, height: 480 })).not.toThrow();
    expect(canvas.width).toBe(640);
  });

  it("clears the previous frame before drawing the new one", () => {
    const { canvas, context } = setUpCanvas();

    drawPoseFrame(canvas, shoulders);

    expect(context?.clearRect).toHaveBeenCalledWith(0, 0, 100, 50);
  });

  describe("skeleton bones", () => {
    it("draws a bone between two visible connected landmarks in canvas pixels", () => {
      const { canvas, context } = setUpCanvas();

      drawPoseFrame(canvas, shoulders);

      expect(context?.moveTo).toHaveBeenCalledWith(25, 25);
      expect(context?.lineTo).toHaveBeenCalledWith(75, 25);
      expect(context?.stroke).toHaveBeenCalledTimes(1);
    });

    it("skips a bone whose far end is missing from the frame", () => {
      const { canvas, context } = setUpCanvas();

      drawPoseFrame(canvas, frameOf(landmark(11)));

      expect(context?.stroke).not.toHaveBeenCalled();
    });

    it("skips a bone whose far end is below the visibility threshold", () => {
      const { canvas, context } = setUpCanvas();

      drawPoseFrame(canvas, frameOf(landmark(11), landmark(12, { visibility: 0.49 })));

      expect(context?.stroke).not.toHaveBeenCalled();
    });

    /** The threshold is inclusive, so a landmark sitting exactly on it still counts as seen. */
    it("draws a bone when both ends sit exactly on the visibility threshold", () => {
      const { canvas, context } = setUpCanvas();

      drawPoseFrame(
        canvas,
        frameOf(landmark(11, { visibility: 0.5 }), landmark(12, { visibility: 0.5 })),
      );

      expect(context?.stroke).toHaveBeenCalledTimes(1);
    });
  });

  describe("landmark dots", () => {
    it("draws a dot for every visible landmark in canvas pixels", () => {
      const { canvas, context } = setUpCanvas();

      drawPoseFrame(canvas, shoulders);

      expect(context?.arc).toHaveBeenCalledWith(25, 25, 5, 0, Math.PI * 2);
      expect(context?.arc).toHaveBeenCalledWith(75, 25, 5, 0, Math.PI * 2);
      expect(context?.fill).toHaveBeenCalledTimes(2);
    });

    /** An unconnected landmark still earns a dot, so dots are not merely a by-product of bones. */
    it("draws a dot for a landmark that has no drawable bone", () => {
      const { canvas, context } = setUpCanvas();

      drawPoseFrame(canvas, frameOf(landmark(11)));

      expect(context?.fill).toHaveBeenCalledTimes(1);
      expect(context?.stroke).not.toHaveBeenCalled();
    });

    it("skips dots for landmarks below the visibility threshold", () => {
      const { canvas, context } = setUpCanvas();

      drawPoseFrame(canvas, frameOf(landmark(11, { visibility: 0.2 })));

      expect(context?.fill).not.toHaveBeenCalled();
    });
  });
});
