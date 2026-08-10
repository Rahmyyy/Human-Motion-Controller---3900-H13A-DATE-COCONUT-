import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

// Every page is replaced by a name tag, so these tests are about routing and nothing else.
// The factories are hoisted above this file's own code, so each one stands alone.
vi.mock("@/features/dashboard/MainDashboardPage", () => ({
  default: () => <div>Main dashboard</div>,
}));
vi.mock("@/features/dashboard/LiveDashboardPage", () => ({
  default: () => <div>Live dashboard</div>,
}));
vi.mock("@/features/presets/PresetSelectionPage", () => ({
  default: () => <div>Preset selection</div>,
}));
vi.mock("@/features/presets/DefaultPoseCalibrationPage", () => ({
  default: () => <div>Default pose</div>,
}));
vi.mock("@/features/patient-history/PatientHistoryPage", () => ({
  default: () => <div>Patient history</div>,
}));
vi.mock("@/features/preset-mapping/PresetMappingsPage", () => ({
  default: () => <div>Preset mappings</div>,
}));
vi.mock("@/features/movement-mapping/MovementMappingRoutePage", () => ({
  default: () => <div>Movement mapping</div>,
}));
vi.mock("@/features/movement-recognition/MovementRecognitionPage", () => ({
  default: () => <div>Recognition</div>,
}));
vi.mock("@/features/session/LiveSessionPage", () => ({
  default: () => <div>Live session</div>,
}));
vi.mock("@/features/session/SessionOverlayWindow", () => ({
  default: () => <div>Session overlay</div>,
}));

const preset = "/patients/patient-1/presets/preset-1";

function renderAt(route: string) {
  window.location.hash = `#${route}`;
  render(<App />);
}

beforeEach(() => {
  window.location.hash = "";
});

describe("App routes", () => {
  it("opens on the clinician's dashboard", () => {
    renderAt("/");

    expect(screen.getByText("Main dashboard")).toBeInTheDocument();
  });

  it.each([
    ["/patients/patient-1/presets", "Preset selection"],
    ["/patients/patient-1/history", "Patient history"],
    [`${preset}/edit`, "Preset mappings"],
    [`${preset}/default-pose`, "Default pose"],
    [`${preset}/recognition`, "Recognition"],
    [`${preset}/dashboard`, "Live dashboard"],
    [`${preset}/session`, "Live session"],
    [`${preset}/overlay`, "Session overlay"],
  ])("shows %s", (route, expected) => {
    renderAt(route);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  /** Recording a new movement and editing a saved one are the same page. */
  it.each([`${preset}/movements/new`, `${preset}/movements/mapping-1/edit`])(
    "shows the movement editor at %s",
    (route) => {
      renderAt(route);

      expect(screen.getByText("Movement mapping")).toBeInTheDocument();
    },
  );

  it("shows nothing for a route the app does not have", () => {
    renderAt("/nowhere");

    expect(screen.queryByText("Main dashboard")).not.toBeInTheDocument();
  });
});
