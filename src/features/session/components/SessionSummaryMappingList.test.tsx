import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import SessionSummaryMappingList, {
  type SessionSummaryMappingRow,
} from "./SessionSummaryMappingList";

const row = (overrides: Partial<SessionSummaryMappingRow> = {}): SessionSummaryMappingRow => ({
  id: "mapping-1",
  name: "Left arm raise",
  keybind: "A",
  triggerCount: 4,
  ...overrides,
});

function renderList(props: Partial<React.ComponentProps<typeof SessionSummaryMappingList>> = {}) {
  return render(
    <MemoryRouter>
      <SessionSummaryMappingList
        isLoading={false}
        loadError={null}
        patientId="patient-1"
        presetId="preset-1"
        rows={[row()]}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("SessionSummaryMappingList", () => {
  it("titles the panel and says what the rows are for", () => {
    renderList();

    expect(screen.getByRole("heading", { name: "Movement Breakdown" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Triggers per movement mapping. Select a movement to adjust its tolerance or keybind.",
      ),
    ).toBeInTheDocument();
  });

  it("lists each mapping with its key and trigger count", () => {
    renderList();

    const entry = screen.getByRole("listitem");
    expect(within(entry).getByText("Left arm raise")).toBeInTheDocument();
    expect(within(entry).getByText("Triggered 4x")).toBeInTheDocument();
    expect(within(entry).getByText("A")).toBeInTheDocument();
  });

  /** A mapping that never fired is the interesting one, so it is called out rather than shown
   *  as a bare zero. */
  it("calls out a mapping that never fired", () => {
    renderList({ rows: [row({ triggerCount: 0 })] });

    expect(screen.getByText("Not triggered")).toBeInTheDocument();
  });

  it("links each mapping to its editor", () => {
    renderList();

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/patients/patient-1/presets/preset-1/movements/mapping-1/edit",
    );
  });

  it("says so when the preset has no mappings", () => {
    renderList({ rows: [] });

    expect(screen.getByText("No mappings saved for this preset.")).toBeInTheDocument();
  });

  it("shows a loading note while the mappings are fetched", () => {
    renderList({ isLoading: true });

    expect(screen.getByText("Loading mappings…")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("shows the load failure in place of the list", () => {
    renderList({ loadError: "Preset not found.", rows: [row()] });

    expect(screen.getByText("Preset not found.")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  /** A load still in flight has not failed yet, so the note wins over a stale error. */
  it("prefers the loading note over an error while still loading", () => {
    renderList({ isLoading: true, loadError: "Preset not found." });

    expect(screen.getByText("Loading mappings…")).toBeInTheDocument();
    expect(screen.queryByText("Preset not found.")).not.toBeInTheDocument();
  });
});
