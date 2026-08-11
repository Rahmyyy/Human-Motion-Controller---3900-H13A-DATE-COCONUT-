import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { poseService } from "@/features/camera/services/poseService";
import {
  createDefaultPoseCalibration,
  type DefaultPoseCalibration,
  type DefaultPoseCalibrationSnapshot,
} from "@/modules/patient-presets";
import { useDefaultPoseCalibration } from "./useDefaultPoseCalibration";

// The calibration service belongs to the patient-presets module; this hook only adapts it.
vi.mock("@/modules/patient-presets", () => ({ createDefaultPoseCalibration: vi.fn() }));
vi.mock("@/features/camera/services/poseService", () => ({
  poseService: { name: "pose-service" },
}));

const loading: DefaultPoseCalibrationSnapshot = {
  canSave: false,
  countdownSeconds: null,
  error: null,
  presetId: null,
  recordedFrames: [],
  recordingQuality: null,
  recordingState: "idle",
  recordingTrim: null,
  status: "loading",
};

let listener: (() => void) | null;
let snapshot: DefaultPoseCalibrationSnapshot;
let service: DefaultPoseCalibration;

function Probe({ patientId = "patient-1", presetId = "preset-1" }) {
  const view = useDefaultPoseCalibration(patientId, presetId);
  return (
    <button type="button" onClick={view.startRecording}>
      {view.status}
    </button>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listener = null;
  snapshot = loading;
  service = {
    getSnapshot: () => snapshot,
    subscribe: (next: () => void) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    start: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(),
    startRecording: vi.fn(),
    cancelCountdown: vi.fn(),
    stopRecording: vi.fn(),
    resetRecording: vi.fn(),
    trimRecording: vi.fn(),
    save: vi.fn(() => Promise.resolve()),
  };
  vi.mocked(createDefaultPoseCalibration).mockReturnValue(service);
});

describe("useDefaultPoseCalibration", () => {
  it("builds the calibration on the shared pose service", () => {
    render(<Probe />);

    expect(createDefaultPoseCalibration).toHaveBeenCalledWith(poseService);
  });

  it("starts the calibration for the route it was mounted on", () => {
    render(<Probe />);

    expect(service.start).toHaveBeenCalledWith("patient-1", "preset-1");
  });

  it("exposes the calibration snapshot to the page", () => {
    render(<Probe />);

    expect(screen.getByRole("button")).toHaveTextContent("loading");
  });

  it("re-renders when the calibration publishes a change", () => {
    render(<Probe />);

    snapshot = { ...loading, status: "ready" };
    act(() => listener?.());

    expect(screen.getByRole("button")).toHaveTextContent("ready");
  });

  it("exposes the calibration commands to the page", async () => {
    render(<Probe />);

    await userEvent.click(screen.getByRole("button"));

    expect(service.startRecording).toHaveBeenCalled();
  });

  /** One service per mount: a re-render must not discard a recording in progress. */
  it("keeps the same calibration across re-renders", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe />);

    expect(createDefaultPoseCalibration).toHaveBeenCalledTimes(1);
  });

  it("disposes the calibration when the page unmounts", () => {
    render(<Probe />).unmount();

    expect(service.dispose).toHaveBeenCalled();
  });

  it("restarts the calibration when the preset changes", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe presetId="preset-2" />);

    expect(service.dispose).toHaveBeenCalled();
    expect(service.start).toHaveBeenLastCalledWith("patient-1", "preset-2");
  });
});
