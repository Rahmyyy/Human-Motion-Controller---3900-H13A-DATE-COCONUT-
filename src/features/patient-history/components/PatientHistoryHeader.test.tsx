import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import PatientHistoryHeader from "./PatientHistoryHeader";

function Destination() {
  const location = useLocation();
  return (
    <p>
      arrived at {location.pathname} with {JSON.stringify(location.state)}
    </p>
  );
}

function renderHeader(patientId: string | undefined = "patient-1") {
  return render(
    <MemoryRouter initialEntries={["/history"]}>
      <Routes>
        <Route
          path="/history"
          element={<PatientHistoryHeader patientId={patientId} patientName="Alex Smith" />}
        />
        <Route path="/patients/:patientId/presets" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PatientHistoryHeader", () => {
  it("titles the page and says what it covers", () => {
    renderHeader();

    expect(screen.getByRole("heading", { name: "Patient history", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText("Review completed sessions and movement activity over time."),
    ).toBeInTheDocument();
  });

  it("names the patient whose history is on screen", () => {
    renderHeader();

    expect(screen.getByText("Patient")).toBeInTheDocument();
    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
  });

  it("returns to the patient's presets", async () => {
    renderHeader();

    await userEvent.click(screen.getByRole("button", { name: "Back to presets" }));

    expect(screen.getByText(/arrived at \/patients\/patient-1\/presets/)).toBeInTheDocument();
  });

  /** The presets screen shows the name too, so it travels with the navigation. */
  it("carries the patient name to the presets screen", async () => {
    renderHeader();

    await userEvent.click(screen.getByRole("button", { name: "Back to presets" }));

    expect(screen.getByText(/with {"patientName":"Alex Smith"}/)).toBeInTheDocument();
  });

  /** The avatar repeats the label beside it. */
  it("hides its icon from assistive technology", () => {
    const { container } = renderHeader();

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
