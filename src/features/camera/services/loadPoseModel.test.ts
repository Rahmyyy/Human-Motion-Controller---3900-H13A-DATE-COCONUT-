import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadPoseModel } from "./loadPoseModel";

// The real resolver downloads a WASM bundle and a model file; only the wiring is under test.
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vi.fn() },
  PoseLandmarker: { createFromOptions: vi.fn() },
}));

const forVisionTasks = vi.mocked(FilesetResolver.forVisionTasks);
const createFromOptions = vi.mocked(PoseLandmarker.createFromOptions);
const vision = { wasmLoaderPath: "loader" } as Awaited<
  ReturnType<typeof FilesetResolver.forVisionTasks>
>;
const landmarker = {} as PoseLandmarker;

beforeEach(() => {
  forVisionTasks.mockReset().mockResolvedValue(vision);
  createFromOptions.mockReset().mockResolvedValue(landmarker);
});

describe("loadPoseModel", () => {
  /** The WASM bundle must match the installed package, or the model fails to instantiate. */
  it("resolves the vision tasks from the pinned MediaPipe version", async () => {
    await loadPoseModel();

    expect(forVisionTasks).toHaveBeenCalledWith(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
    );
  });

  it("builds the landmarker on the resolved fileset", async () => {
    await loadPoseModel();

    expect(createFromOptions).toHaveBeenCalledWith(vision, expect.anything());
  });

  it("loads the lite pose model on the GPU", async () => {
    await loadPoseModel();

    expect(createFromOptions.mock.calls[0]?.[1].baseOptions).toEqual({
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/" +
        "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
      delegate: "GPU",
    });
  });

  /** A live preview tracks one person from a video stream and never needs a segmentation mask. */
  it("configures a single-pose video tracker without segmentation", async () => {
    await loadPoseModel();

    expect(createFromOptions.mock.calls[0]?.[1]).toMatchObject({
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });
  });

  it("returns the landmarker it built", async () => {
    await expect(loadPoseModel()).resolves.toBe(landmarker);
  });
});
