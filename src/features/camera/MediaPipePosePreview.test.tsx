import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PoseFrame } from "@/modules/pose-capture";
import { drawPoseFrame } from "./drawPoseFrame";
import { usePoseFrames, usePoseService } from "./hooks/usePoseService";
import MediaPipePosePreview from "./MediaPipePosePreview";
import type { PoseServiceStatus } from "./services/poseService.types";

vi.mock("./hooks/usePoseService", () => ({
  usePoseService: vi.fn(),
  usePoseFrames: vi.fn(),
}));
vi.mock("./drawPoseFrame", () => ({ drawPoseFrame: vi.fn() }));

const retry = vi.fn();
const frame: PoseFrame = { timestampMs: 16, landmarks: [] };

function renderPreview(status: PoseServiceStatus = "running", error: string | null = null) {
  vi.mocked(usePoseService).mockReturnValue({ status, error, retry });
  return render(<MediaPipePosePreview />);
}

const cameraFeed = () => screen.getByLabelText("Camera feed") as HTMLVideoElement;

const lastCall = <TArgs extends unknown[]>(calls: TArgs[]) => calls[calls.length - 1];

/** Publishes a frame through the most recent subscription, which holds the live refs. */
function publishFrame() {
  const listener = lastCall(vi.mocked(usePoseFrames).mock.calls)?.[0];
  act(() => listener?.(frame));
}

function sizeVideo(width: number, height: number) {
  Object.defineProperty(cameraFeed(), "videoWidth", { configurable: true, value: width });
  Object.defineProperty(cameraFeed(), "videoHeight", { configurable: true, value: height });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MediaPipePosePreview", () => {
  it("labels the preview for assistive technology", () => {
    renderPreview();

    expect(screen.getByRole("region", { name: "MediaPipe pose preview" })).toBeInTheDocument();
  });

  /** Autoplaying a camera feed is only allowed when it is muted and stays inline on mobile. */
  it("renders a muted inline camera feed", () => {
    renderPreview();

    expect(cameraFeed()).toHaveAttribute("playsinline");
    expect(cameraFeed().muted).toBe(true);
  });

  it("hands the video element to the pose service", () => {
    renderPreview();

    expect(lastCall(vi.mocked(usePoseService).mock.calls)?.[0]).toBe(cameraFeed());
  });

  describe("status messages", () => {
    it("explains the wait while the model downloads", () => {
      renderPreview("loading");

      expect(screen.getByText("Loading pose model...")).toBeInTheDocument();
    });

    it("shows no message once the camera is running", () => {
      renderPreview("running");

      expect(screen.queryByText("Loading pose model...")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    });

    it("shows the failure alongside a retry control", () => {
      renderPreview("error", "Camera permission was denied.");

      expect(screen.getByText("Camera permission was denied.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });

    it("asks the service to start again on retry", async () => {
      renderPreview("error", "Camera permission was denied.");

      await userEvent.click(screen.getByRole("button", { name: "Try again" }));

      expect(retry).toHaveBeenCalled();
    });
  });

  describe("overlay drawing", () => {
    it("draws each frame at the video's native resolution", () => {
      const { container } = renderPreview();
      sizeVideo(640, 480);

      publishFrame();

      expect(drawPoseFrame).toHaveBeenCalledWith(container.querySelector("canvas"), frame, {
        width: 640,
        height: 480,
      });
    });

    /** Frames can arrive before the video has decoded anything, when its size is still zero. */
    it("skips drawing until the video reports a size", () => {
      renderPreview();
      sizeVideo(0, 0);

      publishFrame();

      expect(drawPoseFrame).not.toHaveBeenCalled();
    });

    it("skips drawing when the video has width but no height", () => {
      renderPreview();
      sizeVideo(640, 0);

      publishFrame();

      expect(drawPoseFrame).not.toHaveBeenCalled();
    });
  });
});
