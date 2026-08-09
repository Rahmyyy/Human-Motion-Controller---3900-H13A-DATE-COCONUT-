import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import PresetMappingsHeader from "./PresetMappingsHeader";

function Destination() {
  const location = useLocation();
  return <p>arrived at {location.pathname}</p>;
}

/** Mounts the header on a route pair so the back button's destination can be asserted. */
function renderWithRoutes(patientId?: string) {
  return render(
    <MemoryRouter initialEntries={["/mappings"]}>
      <Routes>
        <Route
          path="/mappings"
          element={
            <PresetMappingsHeader
              canAddMovement
              patientId={patientId}
              presetId="preset-1"
              presetName="Mario Kart"
            />
          }
        />
        <Route path="/patients/:patientId/presets" element={<Destination />} />
        <Route path="/" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderHeader(props: Partial<React.ComponentProps<typeof PresetMappingsHeader>> = {}) {
  return render(
    <MemoryRouter>
      <PresetMappingsHeader
        canAddMovement
        patientId="patient-1"
        presetId="preset-1"
        presetName="Mario Kart"
        {...props}
      />
    </MemoryRouter>,
  );
}

const addMovement = () => screen.getByText("Add New Movement");

describe("PresetMappingsHeader", () => {
  it("titles the page with the preset being edited", () => {
    renderHeader();

    expect(
      screen.getByRole("heading", { name: "Mario Kart Mappings", level: 1 }),
    ).toBeInTheDocument();
  });

  /** The name arrives with the preset, so the heading has to read sensibly before it lands. */
  it("falls back to a bare title before the preset loads", () => {
    renderHeader({ presetName: null });

    expect(screen.getByRole("heading", { name: "Mappings", level: 1 })).toBeInTheDocument();
  });

  it("explains what the page configures", () => {
    renderHeader();

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Configure movement mappings and keybinds for this preset.",
    );
    expect(screen.getByRole("button", { name: "About movement mappings" })).toHaveAttribute(
      "aria-describedby",
      "mapping-page-help",
    );
  });

  describe("adding a movement", () => {
    it("links to the recorder once the preset is calibrated", () => {
      renderHeader();

      expect(screen.getByRole("link", { name: "Add New Movement" })).toHaveAttribute(
        "href",
        "/patients/patient-1/presets/preset-1/movements/new",
      );
    });

    /** Recording a movement needs a default pose to compare against, so it waits for one. */
    it("offers no link until the preset is calibrated", () => {
      renderHeader({ canAddMovement: false });

      expect(screen.queryByRole("link", { name: "Add New Movement" })).not.toBeInTheDocument();
      expect(addMovement()).toBeInTheDocument();
    });

    it("offers no link before the preset id is known", () => {
      renderHeader({ presetId: undefined });

      expect(screen.queryByRole("link", { name: "Add New Movement" })).not.toBeInTheDocument();
    });
  });

  describe("back link", () => {
    it("returns to the patient's preset list", async () => {
      renderWithRoutes("patient-1");

      await userEvent.click(screen.getByRole("button", { name: "Back" }));

      expect(screen.getByText("arrived at /patients/patient-1/presets")).toBeInTheDocument();
    });

    /** A route without a patient has no preset list to return to, so it falls back home. */
    it("falls back to the dashboard when there is no patient", async () => {
      renderWithRoutes();

      await userEvent.click(screen.getByRole("button", { name: "Back" }));

      expect(screen.getByText("arrived at /")).toBeInTheDocument();
    });
  });
});
