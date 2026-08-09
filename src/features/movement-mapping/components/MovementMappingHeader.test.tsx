import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import MovementMappingHeader from "./MovementMappingHeader";

function Destination() {
  const location = useLocation();
  return <p>arrived at {location.pathname}</p>;
}

function renderHeader(backTo = "/patients/patient-1/presets/preset-1/edit") {
  return render(
    <MemoryRouter initialEntries={["/record"]}>
      <Routes>
        <Route
          path="/record"
          element={
            <MovementMappingHeader
              backTo={backTo}
              description="Capture a physical movement and assign it to a keybind."
              title="Record and Map New Movement"
            />
          }
        />
        <Route path={backTo} element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MovementMappingHeader", () => {
  it("titles the screen at the top level of the page", () => {
    renderHeader();

    expect(
      screen.getByRole("heading", { name: "Record and Map New Movement", level: 1 }),
    ).toBeInTheDocument();
  });

  it("explains what the screen is for", () => {
    renderHeader();

    expect(
      screen.getByText("Capture a physical movement and assign it to a keybind."),
    ).toBeInTheDocument();
  });

  it("takes the clinician back to the preset it was opened from", async () => {
    renderHeader();

    await userEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(
      screen.getByText("arrived at /patients/patient-1/presets/preset-1/edit"),
    ).toBeInTheDocument();
  });
});
