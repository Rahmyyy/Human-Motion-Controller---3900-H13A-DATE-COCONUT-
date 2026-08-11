import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Preset } from "@/modules/patient-presets";
import { usePresetMappings } from "./hooks/usePresetMappings";
import PresetMappingsPage from "./PresetMappingsPage";

vi.mock("./hooks/usePresetMappings", () => ({ usePresetMappings: vi.fn() }));
vi.mock("./components/PresetMappingsHeader", () => ({
  default: ({
    canAddMovement,
    presetName,
  }: {
    canAddMovement: boolean;
    presetName: string | null;
  }) => (
    <div
      data-testid="header"
      data-can-add={canAddMovement}
      data-preset-name={presetName ?? "none"}
    />
  ),
}));
vi.mock("./components/CalibrationRequirementCard", () => ({
  default: ({ isCalibrated, presetId }: { isCalibrated: boolean; presetId: string }) => (
    <div data-testid="calibration" data-calibrated={isCalibrated} data-preset-id={presetId} />
  ),
}));
vi.mock("./components/PresetMappingCollection", () => ({
  default: ({ mappings, presetId }: { mappings: unknown[]; presetId: string }) => (
    <div data-testid="collection" data-count={mappings.length} data-preset-id={presetId} />
  ),
}));

const preset = (overrides: Partial<Preset> = {}): Preset => ({
  id: "preset-1",
  patientId: "patient-1",
  name: "Mario Kart",
  createdAt: "0",
  mappingCount: 0,
  defaultPoseFramesJson: "[]",
  ...overrides,
});

type Snapshot = ReturnType<typeof usePresetMappings>;

function renderPage(
  overrides: Partial<Snapshot> = {},
  path = "/patients/patient-1/presets/preset-1/edit",
) {
  vi.mocked(usePresetMappings).mockReturnValue({
    deletingMappingId: null,
    error: null,
    isLoading: false,
    mappings: [],
    preset: preset(),
    thresholdSaveStates: {},
    deleteMapping: vi.fn(() => Promise.resolve(true)),
    updateThreshold: vi.fn(() => Promise.resolve(true)),
    ...overrides,
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/patients/:patientId/presets/:presetId/edit"
          element={<PresetMappingsPage />}
        />
        <Route path="/patients/:patientId/mappings" element={<PresetMappingsPage />} />
        <Route path="/presets/:presetId/edit" element={<PresetMappingsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PresetMappingsPage", () => {
  it("loads the mappings for the route it was opened on", () => {
    renderPage();

    expect(usePresetMappings).toHaveBeenCalledWith("patient-1", "preset-1");
  });

  it("names the preset in its header", () => {
    renderPage();

    expect(screen.getByTestId("header")).toHaveAttribute("data-preset-name", "Mario Kart");
  });

  it("shows the load failure above the page", () => {
    renderPage({ error: "Preset not found." });

    expect(screen.getByText("Preset not found.")).toBeInTheDocument();
  });

  describe("calibration", () => {
    it("reports a calibrated preset and allows new movements", () => {
      renderPage();

      expect(screen.getByTestId("calibration")).toHaveAttribute("data-calibrated", "true");
      expect(screen.getByTestId("header")).toHaveAttribute("data-can-add", "true");
    });

    /** Without a resting pose there is nothing to compare a movement against. */
    it("blocks new movements until a resting pose exists", () => {
      renderPage({ preset: preset({ defaultPoseFramesJson: null }) });

      expect(screen.getByTestId("calibration")).toHaveAttribute("data-calibrated", "false");
      expect(screen.getByTestId("header")).toHaveAttribute("data-can-add", "false");
    });

    it("waits for the preset before offering calibration", () => {
      renderPage({ preset: null });

      expect(screen.queryByTestId("calibration")).not.toBeInTheDocument();
    });
  });

  describe("mapping collection", () => {
    it("hands the loaded mappings to the collection", () => {
      renderPage({
        mappings: [{ id: "mapping-1" } as Snapshot["mappings"][number]],
      });

      expect(screen.getByTestId("collection")).toHaveAttribute("data-count", "1");
    });

    /** A route with no preset has nothing to list, so the grid is not rendered at all. */
    it("renders no collection without a preset in the route", () => {
      renderPage({}, "/patients/patient-1/mappings");

      expect(screen.queryByTestId("collection")).not.toBeInTheDocument();
    });

    /** A malformed link can omit the patient; the page still renders rather than showing
     *  "undefined" inside the links it builds. */
    it("renders with an empty patient when the route omits one", () => {
      renderPage({}, "/presets/preset-1/edit");

      expect(screen.getByTestId("collection")).toBeInTheDocument();
      expect(screen.getByTestId("calibration")).toHaveAttribute("data-preset-id", "preset-1");
    });
  });

  describe("test recognition", () => {
    it("links to recognition once the preset is calibrated", () => {
      renderPage();

      expect(screen.getByRole("link", { name: "Test Recognition" })).toHaveAttribute(
        "href",
        "/patients/patient-1/presets/preset-1/recognition",
      );
    });

    /** Recognition needs the resting pose, so the button stays dead until one is recorded. */
    it("disables the button until the preset is calibrated", () => {
      renderPage({ preset: preset({ defaultPoseFramesJson: null }) });

      expect(screen.getByRole("button", { name: "Test Recognition" })).toBeDisabled();
    });
  });
});
