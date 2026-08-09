import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPoseModel } from "./loadPoseModel";
import { poseService } from "./poseService";
import {
  deferred,
  fakeModel,
  fakeStream,
  fakeVideo,
  stubAnimationFrames,
  stubCamera,
} from "./poseServiceHarness";

vi.mock("./loadPoseModel", () => ({ loadPoseModel: vi.fn() }));

const loadModel = vi.mocked(loadPoseModel);

let camera: ReturnType<typeof fakeStream>;
let frames: ReturnType<typeof stubAnimationFrames>;
let getUserMedia: ReturnType<typeof vi.fn<() => Promise<MediaStream>>>;

beforeEach(() => {
  camera = fakeStream();
  loadModel.mockReset();
  loadModel.mockResolvedValue(fakeModel());
  getUserMedia = vi.fn(() => Promise.resolve(camera.stream));
  stubCamera(getUserMedia);
  frames = stubAnimationFrames();
});

afterEach(() => {
  poseService.dispose();
  vi.unstubAllGlobals();
});

/** Runs a start that is interrupted partway through by a stop, and reports the outcome. */
async function startInterruptedBy(hold: () => { resolve: () => void; waitFor: () => unknown }) {
  const { resolve, waitFor } = hold();
  const video = fakeVideo();
  const started = poseService.start(video);
  await vi.waitFor(waitFor);

  poseService.stop();
  resolve();
  await started;

  return video;
}

describe("poseService failures", () => {
  describe("error messages", () => {
    it("explains a denied camera permission", async () => {
      getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));

      await poseService.start(fakeVideo());

      expect(poseService.getSnapshot()).toEqual({
        status: "error",
        error: "Camera permission was denied. Allow camera access and try again.",
      });
    });

    it("surfaces the message of any other failure", async () => {
      getUserMedia.mockRejectedValue(new Error("no camera attached"));

      await poseService.start(fakeVideo());

      expect(poseService.getSnapshot().error).toBe("no camera attached");
    });

    /** Browsers occasionally reject with a bare value; the UI still needs something to show. */
    it("falls back to a generic message when the failure is not an error", async () => {
      getUserMedia.mockRejectedValue("something odd");

      await poseService.start(fakeVideo());

      expect(poseService.getSnapshot().error).toBe("Unable to start pose detection.");
    });
  });

  it("releases the camera when playback fails", async () => {
    const video = fakeVideo();
    video.play = vi.fn(() => Promise.reject(new Error("playback blocked")));

    await poseService.start(video);

    expect(camera.track.stop).toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
    expect(frames.pendingCount).toBe(0);
  });

  /** A failed download must not be cached, or the retry button would replay the same failure. */
  it("fetches the model again after a failed load", async () => {
    loadModel.mockRejectedValueOnce(new Error("network down"));

    await poseService.start(fakeVideo());
    expect(poseService.getSnapshot().error).toBe("network down");

    await poseService.start(fakeVideo());

    expect(loadModel).toHaveBeenCalledTimes(2);
    expect(poseService.getSnapshot().status).toBe("running");
  });

  // A preview can unmount while a start is still in flight. Whatever the start was waiting on then
  // arrives for a service that no longer wants it, and must be discarded rather than adopted.
  describe("a start interrupted by a stop", () => {
    it("never opens the camera when the model arrives too late", async () => {
      const model = deferred<ReturnType<typeof fakeModel>>();
      loadModel.mockReturnValue(model.promise);

      await startInterruptedBy(() => ({
        resolve: () => model.resolve(fakeModel()),
        waitFor: () => expect(loadModel).toHaveBeenCalled(),
      }));

      expect(getUserMedia).not.toHaveBeenCalled();
      expect(poseService.getSnapshot()).toEqual({ status: "idle", error: null });
    });

    it("releases a camera stream that arrives too late", async () => {
      const stream = deferred<MediaStream>();
      getUserMedia.mockReturnValue(stream.promise);

      await startInterruptedBy(() => ({
        resolve: () => stream.resolve(camera.stream),
        waitFor: () => expect(getUserMedia).toHaveBeenCalled(),
      }));

      expect(camera.track.stop).toHaveBeenCalled();
      expect(poseService.getSnapshot().status).toBe("idle");
    });

    it("schedules no frames when playback starts too late", async () => {
      const playback = deferred<void>();
      const video = fakeVideo();
      video.play = vi.fn(() => playback.promise);
      const started = poseService.start(video);
      await vi.waitFor(() => expect(video.play).toHaveBeenCalled());

      poseService.stop();
      playback.resolve();
      await started;

      expect(frames.pendingCount).toBe(0);
      expect(poseService.getSnapshot().status).toBe("idle");
    });

    it("stays idle rather than reporting a failure that arrives too late", async () => {
      const stream = deferred<MediaStream>();
      getUserMedia.mockReturnValue(stream.promise);

      await startInterruptedBy(() => ({
        resolve: () => stream.reject(new Error("too late")),
        waitFor: () => expect(getUserMedia).toHaveBeenCalled(),
      }));

      expect(poseService.getSnapshot()).toEqual({ status: "idle", error: null });
    });
  });
});
