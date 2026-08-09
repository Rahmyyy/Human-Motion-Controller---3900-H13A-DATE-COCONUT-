import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPresetSelectionService,
  type PresetSelectionService,
  type PresetSelectionSnapshot,
} from "@/modules/patient-presets";
import { usePresetSelection } from "./usePresetSelection";

// The selection service belongs to the patient-presets module; this hook only adapts it.
vi.mock("@/modules/patient-presets", () => ({ createPresetSelectionService: vi.fn() }));

const loading: PresetSelectionSnapshot = {
  createError: null,
  deleteError: null,
  deletingPresetId: null,
  duplicateError: null,
  duplicatingPresetId: null,
  error: null,
  isCreating: false,
  isLoading: true,
  presets: [],
  selectedPreset: null,
  selectedPresetId: null,
};

let listener: (() => void) | null;
let snapshot: PresetSelectionSnapshot;
let service: PresetSelectionService;

function Probe({ patientId = "patient-1" }) {
  const view = usePresetSelection(patientId);
  return (
    <button type="button" onClick={() => view.selectPreset("preset-1")}>
      {view.isLoading ? "loading" : `${view.presets.length} presets`}
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
    selectPreset: vi.fn(),
    createPreset: vi.fn(() => Promise.resolve(null)),
    duplicatePreset: vi.fn(() => Promise.resolve(null)),
    deletePreset: vi.fn(() => Promise.resolve(true)),
    clearCreateError: vi.fn(),
    clearDuplicateError: vi.fn(),
    clearDeleteError: vi.fn(),
  };
  vi.mocked(createPresetSelectionService).mockReturnValue(service);
});

describe("usePresetSelection", () => {
  it("starts the service for the patient in the route", () => {
    render(<Probe />);

    expect(createPresetSelectionService).toHaveBeenCalled();
    expect(service.start).toHaveBeenCalledWith("patient-1");
  });

  it("exposes the service snapshot to the page", () => {
    render(<Probe />);

    expect(screen.getByRole("button")).toHaveTextContent("loading");
  });

  it("re-renders when the service publishes a change", () => {
    render(<Probe />);

    snapshot = { ...loading, isLoading: false };
    act(() => listener?.());

    expect(screen.getByRole("button")).toHaveTextContent("0 presets");
  });

  it("exposes the service commands to the page", async () => {
    render(<Probe />);

    await userEvent.click(screen.getByRole("button"));

    expect(service.selectPreset).toHaveBeenCalledWith("preset-1");
  });

  /** One service per mount, so a re-render does not refetch the whole preset list. */
  it("keeps the same service across re-renders", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe />);

    expect(createPresetSelectionService).toHaveBeenCalledTimes(1);
  });

  it("disposes the service when the page unmounts", () => {
    render(<Probe />).unmount();

    expect(service.dispose).toHaveBeenCalled();
  });

  it("restarts the service for a different patient", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe patientId="patient-2" />);

    expect(service.dispose).toHaveBeenCalled();
    expect(service.start).toHaveBeenLastCalledWith("patient-2");
  });
});
