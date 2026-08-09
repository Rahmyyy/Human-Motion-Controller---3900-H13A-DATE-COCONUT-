import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { poseService } from "@/features/camera/services/poseService";
import {
  createMappingEditor,
  tauriMovementMappings,
  type MappingEditor,
  type MappingEditorSnapshot,
} from "@/modules/movement-mapping";
import { editorViewModel } from "../testEditor";
import { useMappingEditor } from "./useMappingEditor";

// The editor service is covered by the movement-mapping module; this hook is its React adapter.
vi.mock("@/modules/movement-mapping", () => ({
  createMappingEditor: vi.fn(),
  tauriMovementMappings: { name: "tauri-repository" },
  PressType: { Toggle: "Toggle", Press: "Press", Release: "Release", Click: "Click" },
}));
vi.mock("@/features/camera/services/poseService", () => ({
  poseService: { name: "pose-service" },
}));

const view = editorViewModel();
const snapshot = view as MappingEditorSnapshot;

let listener: (() => void) | null;
let currentSnapshot: MappingEditorSnapshot;
let editor: MappingEditor;

function Probe({
  mappingId,
  patientId = "patient-1",
  presetId = "preset-1",
}: {
  mappingId?: string;
  patientId?: string;
  presetId?: string;
}) {
  const view = useMappingEditor(patientId, presetId, mappingId);
  return (
    <button type="button" onClick={view.startRecording}>
      {view.status}:{view.movementName}
    </button>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listener = null;
  currentSnapshot = snapshot;
  editor = {
    ...view,
    getSnapshot: () => currentSnapshot,
    subscribe: (next: () => void) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    start: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(),
  } as unknown as MappingEditor;
  vi.mocked(createMappingEditor).mockReturnValue(editor);
});

describe("useMappingEditor", () => {
  it("builds the editor on the pose service and the Tauri repository", () => {
    render(<Probe />);

    expect(createMappingEditor).toHaveBeenCalledWith(poseService, tauriMovementMappings);
  });

  it("starts the editor for the route it was mounted on", () => {
    render(<Probe mappingId="mapping-1" />);

    expect(editor.start).toHaveBeenCalledWith({
      mappingId: "mapping-1",
      patientId: "patient-1",
      presetId: "preset-1",
    });
  });

  it("exposes the editor snapshot to the view", () => {
    render(<Probe />);

    expect(screen.getByRole("button")).toHaveTextContent("ready:");
  });

  it("re-renders when the editor publishes a change", () => {
    render(<Probe />);

    currentSnapshot = { ...snapshot, movementName: "Left arm raise" };
    act(() => listener?.());

    expect(screen.getByRole("button")).toHaveTextContent("ready:Left arm raise");
  });

  it("exposes the editor commands to the view", async () => {
    render(<Probe />);

    await userEvent.click(screen.getByRole("button"));

    expect(view.startRecording).toHaveBeenCalled();
  });

  /** One editor per mount: re-rendering must not throw away the recording in progress. */
  it("keeps the same editor across re-renders", () => {
    const { rerender } = render(<Probe />);

    rerender(<Probe />);

    expect(createMappingEditor).toHaveBeenCalledTimes(1);
  });

  it("disposes the editor when the page unmounts", () => {
    render(<Probe />).unmount();

    expect(editor.dispose).toHaveBeenCalled();
  });

  /** Switching to another mapping restarts the same editor rather than building a new one. */
  it("restarts the editor when the route changes", () => {
    const { rerender } = render(<Probe mappingId="mapping-1" />);

    rerender(<Probe mappingId="mapping-2" />);

    expect(editor.dispose).toHaveBeenCalled();
    expect(editor.start).toHaveBeenLastCalledWith({
      mappingId: "mapping-2",
      patientId: "patient-1",
      presetId: "preset-1",
    });
  });
});
