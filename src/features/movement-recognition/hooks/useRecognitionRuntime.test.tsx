import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { poseService } from "@/features/camera/services/poseService";
import {
  createPresetRecognitionRuntime,
  sessionTracker,
  type PresetRecognitionRuntime,
  type PresetRecognitionSnapshot,
} from "@/modules/live-session";
import { useRecognitionRuntime } from "./useRecognitionRuntime";

// The runtime itself belongs to the live-session module; this hook is only its React adapter.
vi.mock("@/modules/live-session", () => ({
  createPresetRecognitionRuntime: vi.fn(),
  sessionTracker: { name: "session-tracker" },
}));
vi.mock("@/features/camera/services/poseService", () => ({
  poseService: { name: "pose-service" },
}));

const idle: PresetRecognitionSnapshot = {
  error: null,
  phase: "idle",
  presetName: null,
  recognitionStatus: {
    bestMatch: null,
    mappingStatuses: [],
    triggeredMappingId: null,
    waitingForDefaultPose: false,
    error: null,
  },
};

let listener: (() => void) | null;
let snapshot: PresetRecognitionSnapshot;
let runtime: PresetRecognitionRuntime;

function Probe({ patientId = "patient-1", presetId = "preset-1" }) {
  const { phase, presetName } = useRecognitionRuntime(patientId, presetId);
  return (
    <p>
      {phase}:{presetName ?? "none"}
    </p>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listener = null;
  snapshot = idle;
  runtime = {
    getSnapshot: () => snapshot,
    subscribe: (next: () => void) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    start: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(),
  };
  vi.mocked(createPresetRecognitionRuntime).mockReturnValue(runtime);
});

describe("useRecognitionRuntime", () => {
  /** The message is the runtime's, so the hook has to hand over the wording the screen expects. */
  it("builds the runtime on the pose service, the tracker, and the calibration prompt", () => {
    render(<Probe />);

    expect(createPresetRecognitionRuntime).toHaveBeenCalledWith(
      poseService,
      sessionTracker,
      "Record a default resting state before testing recognition.",
    );
  });

  it("starts the runtime for the route it was mounted on", () => {
    render(<Probe />);

    expect(runtime.start).toHaveBeenCalledWith("patient-1", "preset-1");
  });

  it("exposes the runtime snapshot to the view", () => {
    render(<Probe />);

    expect(screen.getByText("idle:none")).toBeInTheDocument();
  });

  it("re-renders when the runtime publishes a change", () => {
    render(<Probe />);

    snapshot = { ...idle, phase: "running", presetName: "Mario Kart" };
    act(() => listener?.());

    expect(screen.getByText("running:Mario Kart")).toBeInTheDocument();
  });

  /** One runtime per mount: a re-render must not tear down a recogniser that is already running. */
  it("keeps the same runtime across re-renders", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe />);

    expect(createPresetRecognitionRuntime).toHaveBeenCalledTimes(1);
  });

  it("disposes the runtime when the page unmounts", () => {
    render(<Probe />).unmount();

    expect(runtime.dispose).toHaveBeenCalled();
  });

  it("restarts the runtime when the preset changes", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe presetId="preset-2" />);

    expect(runtime.dispose).toHaveBeenCalled();
    expect(runtime.start).toHaveBeenLastCalledWith("patient-1", "preset-2");
  });
});
