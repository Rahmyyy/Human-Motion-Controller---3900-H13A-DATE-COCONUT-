import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import CalibrationRequirementCard from "./CalibrationRequirementCard";

function renderCard(isCalibrated: boolean) {
  return render(
    <MemoryRouter>
      <CalibrationRequirementCard
        isCalibrated={isCalibrated}
        patientId="patient-1"
        presetId="preset-1"
      />
    </MemoryRouter>,
  );
}

describe("CalibrationRequirementCard", () => {
  describe("before a resting state is recorded", () => {
    it("asks for the recording it still needs", () => {
      renderCard(false);

      expect(
        screen.getByRole("heading", { name: "Default resting state required" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Record the patient's resting posture before adding movement mappings."),
      ).toBeInTheDocument();
    });

    /** Calibration blocks everything else on the page, so the action is the primary button. */
    it("offers recording as the primary action", () => {
      renderCard(false);

      const action = screen.getByRole("link", { name: "Record Default State" });
      expect(action).toHaveAttribute("href", "/patients/patient-1/presets/preset-1/default-pose");
      expect(action).toHaveAttribute("data-variant", "default");
    });
  });

  describe("once a resting state exists", () => {
    it("confirms the preset is calibrated", () => {
      renderCard(true);

      expect(
        screen.getByRole("heading", { name: "Default resting state recorded" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Recognition is calibrated to this patient's resting posture."),
      ).toBeInTheDocument();
    });

    /** Re-recording is a rare correction, so it steps back to a secondary button. */
    it("offers re-recording as a secondary action to the same screen", () => {
      renderCard(true);

      const action = screen.getByRole("link", { name: "Re-record" });
      expect(action).toHaveAttribute("href", "/patients/patient-1/presets/preset-1/default-pose");
      expect(action).toHaveAttribute("data-variant", "outline");
    });
  });

  /** The icon repeats the heading, so it must not be announced twice. */
  it("hides its status icon from assistive technology", () => {
    const { container } = renderCard(true);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
