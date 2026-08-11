import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPatientHistory,
  type PatientHistory,
  type PatientHistorySnapshot,
} from "@/modules/patient-history";
import { activity, presetUsage, thresholdSeries } from "../testHistory";
import { usePatientHistory } from "./usePatientHistory";

// The history service belongs to the patient-history module; this hook only adapts it to React.
vi.mock("@/modules/patient-history", () => ({ createPatientHistory: vi.fn() }));

const loading: PatientHistorySnapshot = {
  error: null,
  isLoading: true,
  patientName: null,
  filter: { dateRange: "30d", presetId: "all" },
  presetOptions: [],
  totalSessionCount: 0,
  sessions: [],
  summary: {
    completedSessions: 0,
    totalDurationMs: 0,
    successfulTriggers: 0,
    averageTriggersPerSession: 0,
  },
  activity: activity({ points: [] }),
  presetUsage: presetUsage({ slices: [] }),
  thresholds: thresholdSeries({ mappings: [], points: [] }),
};

let listener: (() => void) | null;
let snapshot: PatientHistorySnapshot;
let history: PatientHistory;

function Probe({ patientId = "patient-1" }) {
  const view = usePatientHistory(patientId);
  return (
    <button type="button" onClick={() => view.setDateRange("all")}>
      {view.isLoading ? "loading" : (view.patientName ?? "unnamed")}
    </button>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listener = null;
  snapshot = loading;
  history = {
    getSnapshot: () => snapshot,
    subscribe: (next: () => void) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    start: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(),
    setDateRange: vi.fn(),
    setPresetId: vi.fn(),
    retry: vi.fn(() => Promise.resolve()),
  };
  vi.mocked(createPatientHistory).mockReturnValue(history);
});

describe("usePatientHistory", () => {
  it("starts the history service for the patient in the route", () => {
    render(<Probe />);

    expect(createPatientHistory).toHaveBeenCalled();
    expect(history.start).toHaveBeenCalledWith("patient-1");
  });

  it("exposes the service snapshot to the page", () => {
    render(<Probe />);

    expect(screen.getByRole("button")).toHaveTextContent("loading");
  });

  it("re-renders when the service publishes a change", () => {
    render(<Probe />);

    snapshot = { ...loading, isLoading: false, patientName: "Alex Smith" };
    act(() => listener?.());

    expect(screen.getByRole("button")).toHaveTextContent("Alex Smith");
  });

  it("exposes the filter commands to the page", async () => {
    render(<Probe />);

    await userEvent.click(screen.getByRole("button"));

    expect(history.setDateRange).toHaveBeenCalledWith("all");
  });

  /** One service per mount, so changing a filter does not rebuild the whole history. */
  it("keeps the same service across re-renders", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe />);

    expect(createPatientHistory).toHaveBeenCalledTimes(1);
  });

  it("disposes the service when the page unmounts", () => {
    render(<Probe />).unmount();

    expect(history.dispose).toHaveBeenCalled();
  });

  it("restarts the service for a different patient", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe patientId="patient-2" />);

    expect(history.dispose).toHaveBeenCalled();
    expect(history.start).toHaveBeenLastCalledWith("patient-2");
  });
});
