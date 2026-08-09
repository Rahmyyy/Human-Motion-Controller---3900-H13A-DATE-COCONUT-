import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import PatientHistoryEmptyState from "./PatientHistoryEmptyState";

function Destination() {
  const location = useLocation();
  return (
    <p>
      arrived at {location.pathname} with {JSON.stringify(location.state)}
    </p>
  );
}

function renderEmptyState(patientId?: string) {
  return render(
    <MemoryRouter initialEntries={["/history"]}>
      <Routes>
        <Route
          path="/history"
          element={<PatientHistoryEmptyState patientId={patientId} patientName="Alex Smith" />}
        />
        <Route path="/patients/:patientId/presets" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PatientHistoryEmptyState", () => {
  it("says there is nothing recorded yet", () => {
    renderEmptyState("patient-1");

    expect(screen.getByRole("heading", { name: "No completed sessions yet" })).toBeInTheDocument();
  });

  /** The clinician needs to know what produces history, not just that there is none. */
  it("explains how sessions come to be recorded, naming the patient", () => {
    renderEmptyState("patient-1");

    expect(
      screen.getByText(
        "Sessions appear here once you start one from Alex Smith's presets and end it from the session overlay.",
      ),
    ).toBeInTheDocument();
  });

  it("offers the way to start one", async () => {
    renderEmptyState("patient-1");

    await userEvent.click(screen.getByRole("button", { name: "Go to presets" }));

    expect(
      screen.getByText('arrived at /patients/patient-1/presets with {"patientName":"Alex Smith"}'),
    ).toBeInTheDocument();
  });

  /** A route without a patient has no preset list to send anyone to. */
  it("offers no way out when the patient is unknown", () => {
    renderEmptyState();

    expect(screen.getByRole("button", { name: "Go to presets" })).toBeDisabled();
  });
});
