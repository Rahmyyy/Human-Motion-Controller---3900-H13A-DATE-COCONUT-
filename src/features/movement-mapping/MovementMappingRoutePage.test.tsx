import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MappingEditorViewModel } from "@/modules/movement-mapping";
import { useMappingEditor } from "./hooks/useMappingEditor";
import MovementMappingRoutePage from "./MovementMappingRoutePage";
import { editorViewModel } from "./testEditor";

vi.mock("./hooks/useMappingEditor", () => ({ useMappingEditor: vi.fn() }));
vi.mock("./components/MovementMappingWorkspace", () => ({
  default: ({
    presentation,
  }: {
    presentation: { backTo: string; description: string; title: string };
  }) => (
    <div data-testid="workspace" data-back-to={presentation.backTo}>
      <h1>{presentation.title}</h1>
      <p>{presentation.description}</p>
    </div>
  ),
}));

const NEW_MAPPING = "/patients/patient-1/presets/preset-1/mappings/new";
const EDIT_MAPPING = "/patients/patient-1/presets/preset-1/mappings/mapping-1";

/** Echoes the route the page redirected to so navigation can be asserted from the DOM. */
function Destination() {
  const location = useLocation();
  return <p>arrived at {location.pathname}</p>;
}

function renderPage(editor: Partial<MappingEditorViewModel>, path = NEW_MAPPING) {
  vi.mocked(useMappingEditor).mockReturnValue(editorViewModel(editor));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/patients/:patientId/presets/:presetId/mappings/new"
          element={<MovementMappingRoutePage />}
        />
        <Route
          path="/patients/:patientId/presets/:presetId/mappings/:mappingId"
          element={<MovementMappingRoutePage />}
        />
        <Route
          path="/presets/:presetId/mappings/:mappingId"
          element={<MovementMappingRoutePage />}
        />
        <Route path="/mappings/new" element={<MovementMappingRoutePage />} />
        <Route path="/patients/:patientId/presets/:presetId/edit" element={<Destination />} />
        <Route
          path="/patients/:patientId/presets/:presetId/default-pose"
          element={<Destination />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MovementMappingRoutePage", () => {
  describe("recording a new mapping", () => {
    it("opens the workspace with the recording wording", () => {
      renderPage({ status: "ready" });

      expect(
        screen.getByRole("heading", { name: "Record and Map New Movement" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Capture a physical movement and assign it to a keybind."),
      ).toBeInTheDocument();
    });

    it("points the way back at the preset being edited", () => {
      renderPage({ status: "ready" });

      expect(screen.getByTestId("workspace")).toHaveAttribute(
        "data-back-to",
        "/patients/patient-1/presets/preset-1/edit",
      );
    });

    it("keeps the workspace open while a save is in flight", () => {
      renderPage({ status: "saving" });

      expect(screen.getByTestId("workspace")).toBeInTheDocument();
    });

    /** A new mapping needs a calibrated default pose to compare against. */
    it("redirects to calibration when the preset has no default pose", () => {
      renderPage({ status: "needs-calibration" });

      expect(
        screen.getByText("arrived at /patients/patient-1/presets/preset-1/default-pose"),
      ).toBeInTheDocument();
    });

    it("explains the wait while the calibration check runs", () => {
      renderPage({ status: "loading" });

      expect(screen.getByText("Checking default-pose calibration...")).toBeInTheDocument();
    });

    /** A failed new recording keeps the reader on this screen with the reason. */
    it("shows a start-up failure in place of the workspace", () => {
      renderPage({ status: "error", error: "Preset not found." });

      expect(screen.getByText("Preset not found.")).toBeInTheDocument();
      expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
    });

    it("returns to the preset once the mapping is saved", () => {
      renderPage({ status: "saved" });

      expect(
        screen.getByText("arrived at /patients/patient-1/presets/preset-1/edit"),
      ).toBeInTheDocument();
    });
  });

  describe("editing an existing mapping", () => {
    it("opens the workspace with the editing wording", () => {
      renderPage({ status: "ready" }, EDIT_MAPPING);

      expect(screen.getByRole("heading", { name: "Edit Mapping" })).toBeInTheDocument();
      expect(
        screen.getByText("Review the saved movement and adjust its mapping details."),
      ).toBeInTheDocument();
    });

    it("explains the wait while the saved mapping loads", () => {
      renderPage({ status: "loading" }, EDIT_MAPPING);

      expect(screen.getByText("Loading mapping...")).toBeInTheDocument();
    });

    it("shows the load failure in place of the workspace", () => {
      renderPage({ status: "error", error: "Mapping not found." }, EDIT_MAPPING);

      expect(screen.getByText("Mapping not found.")).toBeInTheDocument();
    });

    /** An editor that failed without a message must still render an empty, non-crashing screen. */
    it("survives a failure with no message", () => {
      const { container } = renderPage({ status: "error", error: null }, EDIT_MAPPING);

      expect(container.querySelector("p")).toBeEmptyDOMElement();
    });

    /** An existing mapping already has a default pose, so calibration is never forced here. */
    it("does not redirect to calibration", () => {
      renderPage({ status: "needs-calibration" }, EDIT_MAPPING);

      expect(screen.getByText("Loading mapping...")).toBeInTheDocument();
    });

    it("returns to the preset once the change is saved", () => {
      renderPage({ status: "saved" }, EDIT_MAPPING);

      expect(
        screen.getByText("arrived at /patients/patient-1/presets/preset-1/edit"),
      ).toBeInTheDocument();
    });
  });

  // A malformed link can land here without the ids a redirect would need. The page then holds
  // its message rather than routing somewhere that does not exist.
  describe("with ids missing from the route", () => {
    it("stays put when an edit saves without a patient", () => {
      renderPage({ status: "saved" }, "/presets/preset-1/mappings/mapping-1");

      expect(screen.getByText("Loading mapping...")).toBeInTheDocument();
      expect(screen.queryByText(/arrived at/)).not.toBeInTheDocument();
    });

    it("stays put when calibration is needed without a preset", () => {
      renderPage({ status: "needs-calibration" }, "/mappings/new");

      expect(screen.getByText("Checking default-pose calibration...")).toBeInTheDocument();
    });
  });
});
