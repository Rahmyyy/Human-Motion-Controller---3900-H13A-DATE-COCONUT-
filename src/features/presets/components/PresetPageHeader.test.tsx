import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import PresetPageHeader from "./PresetPageHeader";

// The export button has its own suite; this stub keeps these tests focused on the header.
vi.mock("./ExportPatientButton", () => ({
  default: ({ patientId }: { patientId: string | undefined }) => (
    <div data-testid="export-button" data-patient-id={patientId ?? "none"} />
  ),
}));

function Destination() {
  const location = useLocation();
  return (
    <p>
      arrived at {location.pathname} with {JSON.stringify(location.state)}
    </p>
  );
}

function renderHeader(patientId?: string) {
  return render(
    <MemoryRouter initialEntries={["/presets"]}>
      <Routes>
        <Route
          path="/presets"
          element={<PresetPageHeader patientId={patientId} patientName="Alex Smith" />}
        />
        <Route path="/patients/:patientId/history" element={<Destination />} />
        <Route path="/" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PresetPageHeader", () => {
  it("titles the page and names the patient", () => {
    renderHeader("patient-1");

    expect(screen.getByRole("heading", { name: "Choose a preset", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Patient")).toBeInTheDocument();
    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
  });

  it("offers patient export", () => {
    renderHeader("patient-1");

    expect(screen.getByTestId("export-button")).toHaveAttribute("data-patient-id", "patient-1");
  });

  describe("patient history", () => {
    /** The history screen shows the name too, so it travels with the navigation. */
    it("opens the patient's history, carrying their name", async () => {
      renderHeader("patient-1");

      await userEvent.click(screen.getByRole("button", { name: "Patient History" }));

      expect(
        screen.getByText(
          'arrived at /patients/patient-1/history with {"patientName":"Alex Smith"}',
        ),
      ).toBeInTheDocument();
    });

    it("locks itself when the patient is unknown", () => {
      renderHeader();

      expect(screen.getByRole("button", { name: "Patient History" })).toBeDisabled();
    });
  });

  it("goes back to the dashboard", async () => {
    renderHeader("patient-1");

    await userEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByText(/arrived at \//)).toBeInTheDocument();
  });
});
