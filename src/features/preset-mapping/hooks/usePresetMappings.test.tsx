import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMappingCollection,
  tauriMovementMappings,
  type MappingCollection,
  type MappingCollectionSnapshot,
} from "@/modules/movement-mapping";
import { usePresetMappings } from "./usePresetMappings";

// The collection service belongs to the movement-mapping module; this hook only adapts it.
vi.mock("@/modules/movement-mapping", () => ({
  createMappingCollection: vi.fn(),
  tauriMovementMappings: { name: "tauri-repository" },
}));

const empty: MappingCollectionSnapshot = {
  deletingMappingId: null,
  error: null,
  isLoading: true,
  mappings: [],
  preset: null,
  thresholdSaveStates: {},
};

let listener: (() => void) | null;
let snapshot: MappingCollectionSnapshot;
let collection: MappingCollection;

function Probe({ patientId = "patient-1", presetId = "preset-1" }) {
  const view = usePresetMappings(patientId, presetId);
  return (
    <button type="button" onClick={() => void view.deleteMapping("mapping-1")}>
      {view.isLoading ? "loading" : `${view.mappings.length} mappings`}
    </button>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listener = null;
  snapshot = empty;
  collection = {
    getSnapshot: () => snapshot,
    subscribe: (next: () => void) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    start: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(),
    deleteMapping: vi.fn(() => Promise.resolve(true)),
    updateThreshold: vi.fn(() => Promise.resolve(true)),
  };
  vi.mocked(createMappingCollection).mockReturnValue(collection);
});

describe("usePresetMappings", () => {
  it("builds the collection on the Tauri repository", () => {
    render(<Probe />);

    expect(createMappingCollection).toHaveBeenCalledWith(tauriMovementMappings);
  });

  it("starts the collection for the route it was mounted on", () => {
    render(<Probe />);

    expect(collection.start).toHaveBeenCalledWith("patient-1", "preset-1");
  });

  it("exposes the collection snapshot to the view", () => {
    render(<Probe />);

    expect(screen.getByRole("button")).toHaveTextContent("loading");
  });

  it("re-renders when the collection publishes a change", () => {
    render(<Probe />);

    snapshot = { ...empty, isLoading: false };
    act(() => listener?.());

    expect(screen.getByRole("button")).toHaveTextContent("0 mappings");
  });

  it("exposes the collection commands to the view", async () => {
    render(<Probe />);

    await userEvent.click(screen.getByRole("button"));

    expect(collection.deleteMapping).toHaveBeenCalledWith("mapping-1");
  });

  /** One collection per mount, so a re-render does not refetch the whole preset. */
  it("keeps the same collection across re-renders", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe />);

    expect(createMappingCollection).toHaveBeenCalledTimes(1);
  });

  it("disposes the collection when the page unmounts", () => {
    render(<Probe />).unmount();

    expect(collection.dispose).toHaveBeenCalled();
  });

  it("restarts the collection when the preset changes", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe presetId="preset-2" />);

    expect(collection.dispose).toHaveBeenCalled();
    expect(collection.start).toHaveBeenLastCalledWith("patient-1", "preset-2");
  });
});
