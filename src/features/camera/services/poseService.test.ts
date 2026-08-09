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

// Downloading the real MediaPipe bundle is the one thing this service must not do under test.
vi.mock("./loadPoseModel", () => ({ loadPoseModel: vi.fn() }));

const loadModel = vi.mocked(loadPoseModel);

let camera: ReturnType<typeof fakeStream>;
let frames: ReturnType<typeof stubAnimationFrames>;
let model: ReturnType<typeof fakeModel>;

beforeEach(() => {
  camera = fakeStream();
  model = fakeModel();
  loadModel.mockReset();
  loadModel.mockResolvedValue(model);
  stubCamera(() => Promise.resolve(camera.stream));
  frames = stubAnimationFrames();
});

// dispose() returns the singleton to the state a fresh import would have.
afterEach(() => {
  poseService.dispose();
  vi.unstubAllGlobals();
});

describe("poseService lifecycle", () => {
  describe("status subscription", () => {
    it("reports an idle service before anything starts", () => {
      expect(poseService.getSnapshot()).toEqual({ status: "idle", error: null });
    });

    it("notifies subscribers as the camera comes up", async () => {
      const listener = vi.fn();
      poseService.subscribeStatus(listener);

      await poseService.start(fakeVideo());

      expect(listener).toHaveBeenCalled();
      expect(poseService.getSnapshot()).toEqual({ status: "running", error: null });
    });

    it("stops notifying a listener that unsubscribed", async () => {
      const listener = vi.fn();
      poseService.subscribeStatus(listener)();

      await poseService.start(fakeVideo());

      expect(listener).not.toHaveBeenCalled();
    });

    /** Republishing an unchanged status would re-render every consumer for nothing. */
    it("stays quiet when the status has not actually changed", () => {
      const listener = vi.fn();
      poseService.subscribeStatus(listener);

      poseService.stop();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("start", () => {
    it("attaches the camera stream to the video and schedules the first frame", async () => {
      const video = fakeVideo();

      await poseService.start(video);

      expect(video.srcObject).toBe(camera.stream);
      expect(video.play).toHaveBeenCalled();
      expect(frames.pendingCount).toBe(1);
    });

    it("passes through loading on its way to running", async () => {
      const statuses: string[] = [];
      poseService.subscribeStatus(() => statuses.push(poseService.getSnapshot().status));

      await poseService.start(fakeVideo());

      expect(statuses).toEqual(["loading", "running"]);
    });

    /** The model is the expensive part of a start, so it is fetched once and reused. */
    it("loads the model only once across restarts", async () => {
      const video = fakeVideo();

      await poseService.start(video);
      poseService.stop(video);
      await poseService.start(video);

      expect(loadModel).toHaveBeenCalledTimes(1);
    });

    /** Two previews mounting together must share the single download already in flight. */
    it("shares one model download between overlapping starts", async () => {
      const pending = deferred<ReturnType<typeof fakeModel>>();
      loadModel.mockReturnValue(pending.promise);

      const first = poseService.start(fakeVideo());
      const second = poseService.start(fakeVideo());
      pending.resolve(model);
      await Promise.all([first, second]);

      expect(loadModel).toHaveBeenCalledTimes(1);
      expect(poseService.getSnapshot().status).toBe("running");
    });
  });

  describe("stop", () => {
    it("releases the tracks and detaches the stream", async () => {
      const video = fakeVideo();
      await poseService.start(video);

      poseService.stop(video);

      expect(camera.track.stop).toHaveBeenCalled();
      expect(video.srcObject).toBeNull();
      expect(poseService.getSnapshot()).toEqual({ status: "idle", error: null });
    });

    it("cancels the scheduled frame", async () => {
      await poseService.start(fakeVideo());

      poseService.stop();

      expect(frames.cancelled).toHaveLength(1);
    });

    /** Two previews can unmount in either order; a stale one must not close the live camera. */
    it("ignores a stop from a video it is not showing", async () => {
      const video = fakeVideo();
      await poseService.start(video);

      poseService.stop(fakeVideo());

      expect(camera.track.stop).not.toHaveBeenCalled();
      expect(poseService.getSnapshot().status).toBe("running");
    });
  });

  describe("dispose", () => {
    it("closes the model it was holding", async () => {
      await poseService.start(fakeVideo());

      poseService.dispose();

      expect(model.close).toHaveBeenCalled();
    });

    /** Subscribers belong to previews that are gone by now; a later start must not reach them. */
    it("forgets its subscribers", async () => {
      const listener = vi.fn();
      const frameListener = vi.fn();
      poseService.subscribeStatus(listener);
      poseService.subscribeFrames(frameListener);

      poseService.dispose();
      listener.mockClear();
      await poseService.start(fakeVideo());
      frames.step(16);

      expect(listener).not.toHaveBeenCalled();
      expect(frameListener).not.toHaveBeenCalled();
    });

    /** A disposed service dropped its cached model, so the next start fetches it again. */
    it("reloads the model after a dispose", async () => {
      await poseService.start(fakeVideo());

      poseService.dispose();
      await poseService.start(fakeVideo());

      expect(loadModel).toHaveBeenCalledTimes(2);
    });
  });

  describe("frame subscription", () => {
    it("stops delivering frames to a listener that unsubscribed", async () => {
      const frameListener = vi.fn();
      poseService.subscribeFrames(frameListener)();
      await poseService.start(fakeVideo());

      frames.step(16);

      expect(frameListener).not.toHaveBeenCalled();
    });
  });
});
