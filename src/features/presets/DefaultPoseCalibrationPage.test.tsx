import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DefaultPoseCalibrationViewModel } from "@/modules/patient-presets";
import DefaultPoseCalibrationPage from "./DefaultPoseCalibrationPage";
import { useDefaultPoseCalibration } from "./hooks/useDefaultPoseCalibration";
import { calibrationViewModel } from "./testPresets";

vi.mock("./hooks/useDefaultPoseCalibration", () => ({ useDefaultPoseCalibration: vi.fn() }));
vi.mock("./components/DefaultPoseCalibrationWorkspace", () => ({
  default: ({ backTo }: { backTo: string }) => (
    <div data-testid="workspace" data-back-to={backTo} />
  ),
}));

function Destination() {
  const location = useLocation();
  return <p>arrived at {location.pathname}</p>;
}

const CALIBRATION_ROUTE = "/patients/patient-1/presets/preset-1/default-pose";

function renderPage(
  overrides: Partial<DefaultPoseCalibrationViewModel> = {},
  path = CALIBRATION_ROUTE,
) {
  vi.mocked(useDefaultPoseCalibration).mockReturnValue(calibrationViewModel(overrides));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/patients/:patientId/presets/:presetId/default-pose"
          element={<DefaultPoseCalibrationPage />}
        />
        <Route path="/patients/:patientId/default-pose" element={<DefaultPoseCalibrationPage />} />
        <Route path="/patients/:patientId/presets/:presetId/edit" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DefaultPoseCalibrationPage", () => {
  it("calibrates the preset in the route", () => {
    renderPage();

    expect(useDefaultPoseCalibration).toHaveBeenCalledWith("patient-1", "preset-1");
  });

  it("opens the workspace once the calibration is ready", () => {
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

  it("explains the wait while the preset loads", () => {
    renderPage({ status: "loading" });

    expect(screen.getByText("Loading calibration...")).toBeInTheDocument();
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  });

  describe("when the calibration fails", () => {
    it("shows the reason the service gave", () => {
      renderPage({ status: "error", error: "Camera unavailable." });

      expect(screen.getByText("Camera unavailable.")).toBeInTheDocument();
    });

    /** A failure with no message still has to say something rather than render blank. */
    it("falls back to a missing-preset message", () => {
      renderPage({ status: "error", error: null });

      expect(screen.getByText("Preset not found.")).toBeInTheDocument();
    });
  });

  describe("once saved", () => {
    it("returns to the preset's mappings", () => {
      renderPage({ status: "saved" });

      expect(
        screen.getByText("arrived at /patients/patient-1/presets/preset-1/edit"),
      ).toBeInTheDocument();
    });

    /** Without a preset there is nowhere to return to, so the page holds its message. */
    it("stays put when the route has no preset", () => {
      renderPage({ status: "saved" }, "/patients/patient-1/default-pose");

      expect(screen.getByText("Loading calibration...")).toBeInTheDocument();
      expect(screen.queryByText(/arrived at/)).not.toBeInTheDocument();
    });
  });
});
