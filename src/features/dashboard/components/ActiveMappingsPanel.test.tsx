import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MovementMapping } from "@/modules/movement-mapping";
import ActiveMappingsPanel from "./ActiveMappingsPanel";

const mapping = (overrides: Partial<MovementMapping> = {}): MovementMapping => ({
  id: "mapping-1",
  name: "Left arm raise",
  keybind: "A",
  keypressType: "Click",
  poseFramesJson: "[]",
  selectedLandmarks: [],
  thresholdPercentage: 80,
  keypressTriggerThresholdPercentage: 80,
  ...overrides,
});

function renderPanel(props: Partial<React.ComponentProps<typeof ActiveMappingsPanel>> = {}) {
  return render(
    <ActiveMappingsPanel mappings={[]} isLoading={false} loadError={null} {...props} />,
  );
}

describe("ActiveMappingsPanel", () => {
  it("titles itself and says what the list is for", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "Active Mappings" })).toBeInTheDocument();
    expect(screen.getByText("Movement-to-key bindings for this session.")).toBeInTheDocument();
  });

  it("lists every mapping with the key it fires", () => {
    renderPanel({
      mappings: [mapping(), mapping({ id: "mapping-2", name: "Right kick", keybind: "Spacebar" })],
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Left arm raise")).toBeInTheDocument();
    expect(screen.getByText("Spacebar")).toBeInTheDocument();
  });

  it("says so when the preset has no mappings", () => {
    renderPanel();

    expect(screen.getByText("No mappings saved.")).toBeInTheDocument();
  });

  it("shows a loading note while the mappings are fetched", () => {
    renderPanel({ isLoading: true });

    expect(screen.getByText("Loading mappings.")).toBeInTheDocument();
    expect(screen.queryByText("No mappings saved.")).not.toBeInTheDocument();
  });

  it("shows the load failure in place of the list", () => {
    renderPanel({ loadError: "Preset not found.", mappings: [mapping()] });

    expect(screen.getByText("Preset not found.")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  /** A load still in flight has not failed yet, so the spinner text wins over a stale error. */
  it("prefers the loading note over an error while still loading", () => {
    renderPanel({ isLoading: true, loadError: "Preset not found." });

    expect(screen.getByText("Loading mappings.")).toBeInTheDocument();
    expect(screen.queryByText("Preset not found.")).not.toBeInTheDocument();
  });
});
