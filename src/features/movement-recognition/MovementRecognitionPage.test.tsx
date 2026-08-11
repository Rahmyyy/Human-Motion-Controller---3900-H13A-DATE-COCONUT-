import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PresetRecognitionSnapshot } from "@/modules/live-session";
import MovementRecognitionPage from "./MovementRecognitionPage";
import { useRecognitionRuntime } from "./hooks/useRecognitionRuntime";

vi.mock("./hooks/useRecognitionRuntime", () => ({ useRecognitionRuntime: vi.fn() }));
// The preview owns a camera and the MediaPipe model, both covered by their own suites.
vi.mock("@/features/camera/MediaPipePosePreview", () => ({
  default: () => <div data-testid="live-preview" />,
}));
vi.mock("./components/RecognitionStatusPanel", () => ({
  default: ({ isLoading, loadError }: { isLoading: boolean; loadError: string | null }) => (
    <div data-testid="status-panel" data-loading={isLoading} data-error={loadError ?? "none"} />
  ),
}));

const snapshot = (
  overrides: Partial<PresetRecognitionSnapshot> = {},
): PresetRecognitionSnapshot => ({
  error: null,
  phase: "running",
  presetName: null,
  recognitionStatus: {
    bestMatch: null,
    mappingStatuses: [],
    triggeredMappingId: null,
    waitingForDefaultPose: false,
    error: null,
  },
  ...overrides,
});

function Destination() {
  const location = useLocation();
  return <p>arrived at {location.pathname}</p>;
}

function renderPage(overrides: Partial<PresetRecognitionSnapshot> = {}) {
  vi.mocked(useRecognitionRuntime).mockReturnValue(snapshot(overrides));
  return render(
    <MemoryRouter initialEntries={["/patients/patient-1/presets/preset-1/recognition"]}>
      <Routes>
        <Route
          path="/patients/:patientId/presets/:presetId/recognition"
          element={<MovementRecognitionPage />}
        />
        <Route path="/patients/:patientId/presets/:presetId/edit" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MovementRecognitionPage", () => {
  it("titles the page", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Live Recognition", level: 1 })).toBeInTheDocument();
  });

  it("runs the recogniser for the route it was opened on", () => {
    renderPage();

    expect(useRecognitionRuntime).toHaveBeenCalledWith("patient-1", "preset-1");
  });

  it("shows the camera alongside the recognition status", () => {
    renderPage();

    expect(screen.getByRole("region", { name: "Live camera recognition" })).toBeInTheDocument();
    expect(screen.getByTestId("live-preview")).toBeInTheDocument();
    expect(screen.getByTestId("status-panel")).toBeInTheDocument();
  });

  describe("runtime state", () => {
    it("tells the panel while the preset is still loading", () => {
      renderPage({ phase: "loading" });

      expect(screen.getByTestId("status-panel")).toHaveAttribute("data-loading", "true");
    });

    it("tells the panel once the recogniser is running", () => {
      renderPage({ phase: "running" });

      expect(screen.getByTestId("status-panel")).toHaveAttribute("data-loading", "false");
    });

    it("passes a start-up failure to the panel", () => {
      renderPage({ phase: "error", error: "Preset not found." });

      expect(screen.getByTestId("status-panel")).toHaveAttribute("data-error", "Preset not found.");
    });
  });

  describe("navigation", () => {
    it("goes back to the preset being edited", async () => {
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: "Back" }));

      expect(
        screen.getByText("arrived at /patients/patient-1/presets/preset-1/edit"),
      ).toBeInTheDocument();
    });
  });
});
