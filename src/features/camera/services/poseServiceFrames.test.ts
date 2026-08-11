import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPoseModel } from "./loadPoseModel";
import { poseService } from "./poseService";
import {
  fakeModel,
  fakeStream,
  fakeVideo,
  landmark,
  stubAnimationFrames,
  stubCamera,
} from "./poseServiceHarness";

vi.mock("./loadPoseModel", () => ({ loadPoseModel: vi.fn() }));

const loadModel = vi.mocked(loadPoseModel);

let camera: ReturnType<typeof fakeStream>;
let frames: ReturnType<typeof stubAnimationFrames>;
let model: ReturnType<typeof fakeModel>;

beforeEach(() => {
  camera = fakeStream();
  model = fakeModel([[landmark()]]);
  loadModel.mockReset();
  loadModel.mockResolvedValue(model);
  stubCamera(() => Promise.resolve(camera.stream));
  frames = stubAnimationFrames();
});

afterEach(() => {
  poseService.dispose();
  vi.unstubAllGlobals();
});

/** Brings the service up on a video the test can then advance frame by frame. */
async function startRunning(size?: { width: number; height: number }) {
  const video = fakeVideo(size);
  await poseService.start(video);
  return video;
}

describe("poseService render loop", () => {
  it("publishes the detected pose to its frame subscribers", async () => {
    const frameListener = vi.fn();
    poseService.subscribeFrames(frameListener);
    await startRunning();

    frames.step(16);

    expect(frameListener).toHaveBeenCalledWith({
      timestampMs: 16,
      landmarks: [{ index: 0, x: 0.1, y: 0.2, z: 0.3, visibility: 0.9 }],
    });
  });

  it("keeps a frame queued after every render", async () => {
    await startRunning();

    frames.step(16);

    expect(frames.pendingCount).toBe(1);
  });

  /** No detected person still counts as a frame, so downstream recording keeps its timeline. */
  it("publishes an empty frame when the detector finds no pose", async () => {
    const frameListener = vi.fn();
    model.detectForVideo.mockReturnValue({ landmarks: [] });
    poseService.subscribeFrames(frameListener);
    await startRunning();

    frames.step(16);

    expect(frameListener).toHaveBeenCalledWith({ timestampMs: 16, landmarks: [] });
  });

  /** A video reports zero dimensions until its first decoded frame; detecting on it throws. */
  it("waits for the video to report its dimensions before detecting", async () => {
    await startRunning({ width: 0, height: 0 });

    frames.step(16);

    expect(model.detectForVideo).not.toHaveBeenCalled();
    expect(frames.pendingCount).toBe(1);
  });

  /** The render loop runs faster than the camera, so unchanged frames are not re-detected. */
  it("detects only once per new video time", async () => {
    const video = await startRunning();

    frames.step(16);
    frames.step(32);
    expect(model.detectForVideo).toHaveBeenCalledTimes(1);

    video.currentTime = 1;
    frames.step(48);

    expect(model.detectForVideo).toHaveBeenCalledTimes(2);
  });

  describe("when detection fails", () => {
    beforeEach(async () => {
      model.detectForVideo.mockImplementation(() => {
        throw new Error("detector crashed");
      });
      await startRunning();
      frames.step(16);
    });

    it("reports the failure", () => {
      expect(poseService.getSnapshot()).toEqual({ status: "error", error: "detector crashed" });
    });

    it("releases the camera instead of retrying forever", () => {
      expect(camera.track.stop).toHaveBeenCalled();
      expect(frames.pendingCount).toBe(0);
    });
  });

  /** A frame can already be queued when the preview unmounts; it must find nothing to draw. */
  it("renders nothing once the camera has been released", async () => {
    await startRunning();
    poseService.stop();

    frames.step(16);

    expect(model.detectForVideo).not.toHaveBeenCalled();
    expect(poseService.getSnapshot().status).toBe("idle");
  });
});
