import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import PresetActionBar from "./PresetActionBar";

function Destination() {
  const location = useLocation();
  return <p>arrived at {location.pathname}</p>;
}

const selected = { id: "preset-1", mappingCount: 3, name: "Mario Kart" };

function renderBar(
  { selectedPreset, patientId }: { selectedPreset?: typeof selected; patientId?: string } = {
    selectedPreset: selected,
    patientId: "patient-1",
  },
) {
  return render(
    <MemoryRouter initialEntries={["/presets"]}>
      <Routes>
        <Route
          path="/presets"
          element={
            <PresetActionBar
              patientId={patientId}
              patientName="Alex Smith"
              selectedPreset={selectedPreset}
            />
          }
        />
        <Route path="/patients/:patientId/presets/:presetId/edit" element={<Destination />} />
        <Route path="/patients/:patientId/presets/:presetId/session" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

const editMappings = () => screen.getByRole("button", { name: "Edit Mappings" });
const startSession = () => screen.getByRole("button", { name: "Start Session" });

describe("PresetActionBar", () => {
  it("names the patient the selection is for", () => {
    renderBar();

    expect(screen.getByText("Selected for Alex Smith")).toBeInTheDocument();
  });

  describe("with a preset selected", () => {
    it("names the preset and counts its mappings", () => {
      renderBar();

      expect(screen.getByText("Mario Kart")).toBeInTheDocument();
      expect(screen.getByText("3 mappings")).toBeInTheDocument();
    });

    it("opens the preset's mappings", async () => {
      renderBar();

      await userEvent.click(editMappings());

      expect(
        screen.getByText("arrived at /patients/patient-1/presets/preset-1/edit"),
      ).toBeInTheDocument();
    });

    it("starts a session on the preset", async () => {
      renderBar();

      await userEvent.click(startSession());

      expect(
        screen.getByText("arrived at /patients/patient-1/presets/preset-1/session"),
      ).toBeInTheDocument();
    });
  });

  describe("with nothing selected", () => {
    it("says so instead of naming a preset", () => {
      renderBar({ patientId: "patient-1" });

      expect(screen.getByText("No preset selected")).toBeInTheDocument();
      expect(screen.queryByText(/mappings$/)).not.toBeInTheDocument();
    });

    /** Neither action means anything without a preset to act on. */
    it("locks both actions", () => {
      renderBar({ patientId: "patient-1" });

      expect(editMappings()).toBeDisabled();
      expect(startSession()).toBeDisabled();
    });
  });

  /** A malformed route can omit the patient; the bar must not navigate to a broken path. */
  it("goes nowhere when the patient is unknown", async () => {
    renderBar({ selectedPreset: selected });

    await userEvent.click(startSession());

    expect(screen.queryByText(/arrived at/)).not.toBeInTheDocument();
  });
});
