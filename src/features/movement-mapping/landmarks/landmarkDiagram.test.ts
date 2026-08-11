import { afterEach, describe, expect, it, vi } from "vitest";
import { TRACKED_LANDMARKS } from "@/modules/pose-capture";
import {
  LANDMARK_DIAGRAM_CONNECTIONS,
  LANDMARK_DIAGRAM_HEIGHT,
  LANDMARK_DIAGRAM_NODES,
  LANDMARK_DIAGRAM_WIDTH,
} from "./landmarkDiagram";

const nodeFor = (name: string) => LANDMARK_DIAGRAM_NODES.find((node) => node.name === name);

afterEach(() => {
  vi.doUnmock("@/modules/pose-capture");
  vi.resetModules();
});

describe("landmark diagram", () => {
  it("draws exactly the landmarks the recogniser tracks", () => {
    expect(LANDMARK_DIAGRAM_NODES.map((node) => node.index).sort((a, b) => a - b)).toEqual([
      ...TRACKED_LANDMARKS,
    ]);
  });

  it("names every landmark it draws", () => {
    expect(LANDMARK_DIAGRAM_NODES.every((node) => node.name.length > 0)).toBe(true);
  });

  it("keeps every landmark inside the viewBox", () => {
    const inside = LANDMARK_DIAGRAM_NODES.every(
      (node) =>
        node.x >= 0 &&
        node.x <= LANDMARK_DIAGRAM_WIDTH &&
        node.y >= 0 &&
        node.y <= LANDMARK_DIAGRAM_HEIGHT,
    );

    expect(inside).toBe(true);
  });

  /** The diagram mirrors the camera, so a raised right arm lights the dot on the viewer's right. */
  it.each(["Shoulder", "Elbow", "Wrist", "Hip", "Knee", "Ankle"])(
    "places the right %s to the right of the left one",
    (joint) => {
      expect(nodeFor(`Right ${joint}`)?.x).toBeGreaterThan(nodeFor(`Left ${joint}`)?.x ?? 0);
    },
  );

  it("hangs the body top to bottom, shoulders above ankles", () => {
    expect(nodeFor("Left Shoulder")?.y).toBeLessThan(nodeFor("Left Hip")?.y ?? 0);
    expect(nodeFor("Left Hip")?.y).toBeLessThan(nodeFor("Left Ankle")?.y ?? 0);
  });

  describe("bones", () => {
    it("only join landmarks the diagram actually draws", () => {
      const drawn = new Set(LANDMARK_DIAGRAM_NODES.map((node) => node.index));

      const dangling = LANDMARK_DIAGRAM_CONNECTIONS.filter(
        ([start, end]) => !drawn.has(start) || !drawn.has(end),
      );

      expect(dangling).toEqual([]);
    });

    it("reach every landmark, leaving no dot floating on its own", () => {
      const joined = new Set(LANDMARK_DIAGRAM_CONNECTIONS.flat());

      expect(LANDMARK_DIAGRAM_NODES.filter((node) => !joined.has(node.index))).toEqual([]);
    });
  });

  /** The layout is hand-placed, so a change to the tracked set has to be noticed loudly. */
  it("warns when the diagram drifts out of sync with the tracked landmarks", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.resetModules();
    vi.doMock("@/modules/pose-capture", () => ({ TRACKED_LANDMARKS: [11, 12] }));

    await import("./landmarkDiagram");

    expect(warn).toHaveBeenCalledWith(
      "Landmark diagram nodes are out of sync with TRACKED_LANDMARKS",
    );
  });
});
