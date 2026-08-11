import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PoseFrame } from "@/modules/pose-capture";
import { poseService } from "../services/poseService";
import type { PoseServiceSnapshot } from "../services/poseService.types";
import { usePoseFrames, usePoseService } from "./usePoseService";

// The hooks are a React adapter over the singleton service, so the service itself is a double.
vi.mock("../services/poseService", () => ({
  poseService: {
    getSnapshot: vi.fn(),
    subscribeStatus: vi.fn(() => () => {}),
    subscribeFrames: vi.fn(() => () => {}),
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    dispose: vi.fn(),
  },
}));

const service = vi.mocked(poseService);

function publish(snapshot: PoseServiceSnapshot) {
  service.getSnapshot.mockReturnValue(snapshot);
  act(() => service.subscribeStatus.mock.calls[0]?.[0]());
}

function StatusProbe({ video }: { video: HTMLVideoElement | null }) {
  const { status, error, retry } = usePoseService(video);
  return (
    <button type="button" onClick={retry}>
      {status}:{error ?? "none"}
    </button>
  );
}

function FramesProbe({ listener }: { listener: (frame: PoseFrame) => void }) {
  usePoseFrames(listener);
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  service.getSnapshot.mockReturnValue({ status: "idle", error: null });
  service.subscribeStatus.mockReturnValue(() => {});
  service.subscribeFrames.mockReturnValue(() => {});
  service.start.mockResolvedValue(undefined);
});

describe("usePoseService", () => {
  it("exposes the current service snapshot", () => {
    render(<StatusProbe video={document.createElement("video")} />);

    expect(screen.getByRole("button")).toHaveTextContent("idle:none");
  });

  it("re-renders when the service publishes a new status", () => {
    render(<StatusProbe video={document.createElement("video")} />);

    publish({ status: "error", error: "camera denied" });

    expect(screen.getByRole("button")).toHaveTextContent("error:camera denied");
  });

  describe("lifecycle", () => {
    it("starts the service on the video element it was given", () => {
      const video = document.createElement("video");

      render(<StatusProbe video={video} />);

      expect(service.start).toHaveBeenCalledWith(video);
    });

    /** The ref callback reports null on the first render, before the element exists. */
    it("waits for a video element before starting", () => {
      render(<StatusProbe video={null} />);

      expect(service.start).not.toHaveBeenCalled();
    });

    it("stops the service when the preview unmounts", () => {
      const video = document.createElement("video");
      const { unmount } = render(<StatusProbe video={video} />);

      unmount();

      expect(service.stop).toHaveBeenCalledWith(video);
    });

    it("moves the camera over when the video element is swapped", () => {
      const first = document.createElement("video");
      const second = document.createElement("video");
      const { rerender } = render(<StatusProbe video={first} />);

      rerender(<StatusProbe video={second} />);

      expect(service.stop).toHaveBeenCalledWith(first);
      expect(service.start).toHaveBeenLastCalledWith(second);
    });
  });

  describe("retry", () => {
    it("starts the service again", async () => {
      const video = document.createElement("video");
      render(<StatusProbe video={video} />);

      await userEvent.click(screen.getByRole("button"));

      expect(service.start).toHaveBeenCalledTimes(2);
      expect(service.start).toHaveBeenLastCalledWith(video);
    });

    /** Without an element there is nothing to attach a stream to, so retrying is a no-op. */
    it("does nothing while there is no video element", async () => {
      render(<StatusProbe video={null} />);

      await userEvent.click(screen.getByRole("button"));

      expect(service.start).not.toHaveBeenCalled();
    });
  });
});

describe("usePoseFrames", () => {
  it("subscribes the given listener to pose frames", () => {
    const listener = vi.fn();

    render(<FramesProbe listener={listener} />);

    expect(service.subscribeFrames).toHaveBeenCalledWith(listener);
  });

  it("unsubscribes when the consumer unmounts", () => {
    const unsubscribe = vi.fn();
    service.subscribeFrames.mockReturnValue(unsubscribe);

    render(<FramesProbe listener={vi.fn()} />).unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  /** Callers rebuild the drawing callback whenever the canvas changes; the old one must go. */
  it("resubscribes when the listener changes", () => {
    const unsubscribe = vi.fn();
    service.subscribeFrames.mockReturnValue(unsubscribe);
    const next = vi.fn();
    const { rerender } = render(<FramesProbe listener={vi.fn()} />);

    rerender(<FramesProbe listener={next} />);

    expect(unsubscribe).toHaveBeenCalled();
    expect(service.subscribeFrames).toHaveBeenLastCalledWith(next);
  });
});
