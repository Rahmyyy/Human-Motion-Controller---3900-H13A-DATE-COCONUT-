import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ALL_PRESETS, type PresetFilterOption } from "@/modules/patient-history";
import PatientHistoryFilters from "./PatientHistoryFilters";

const presetOptions: PresetFilterOption[] = [
  { id: ALL_PRESETS, name: "All presets", sessionCount: 4 },
  { id: "preset-1", name: "Mario Kart", sessionCount: 3 },
];

function renderFilters(props: Partial<React.ComponentProps<typeof PatientHistoryFilters>> = {}) {
  const onDateRangeChange = vi.fn();
  const onPresetChange = vi.fn();
  render(
    <PatientHistoryFilters
      dateRange="30d"
      disabled={false}
      onDateRangeChange={onDateRangeChange}
      onPresetChange={onPresetChange}
      presetId={ALL_PRESETS}
      presetOptions={presetOptions}
      {...props}
    />,
  );
  return { onDateRangeChange, onPresetChange };
}

const dateRange = () => screen.getByRole("combobox", { name: "Date range" });
const preset = () => screen.getByRole("combobox", { name: "Preset" });

describe("PatientHistoryFilters", () => {
  describe("date range", () => {
    it("shows the active range", () => {
      renderFilters();

      expect(dateRange()).toHaveTextContent("Last 30 days");
    });

    it("offers every range", async () => {
      renderFilters();

      await userEvent.click(dateRange());

      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Last 7 days",
        "Last 30 days",
        "Last 90 days",
        "All time",
      ]);
    });

    it("reports the chosen range", async () => {
      const { onDateRangeChange } = renderFilters();

      await userEvent.click(dateRange());
      await userEvent.click(screen.getByRole("option", { name: "All time" }));

      expect(onDateRangeChange).toHaveBeenCalledWith("all");
    });
  });

  describe("preset", () => {
    it("shows the active preset", () => {
      renderFilters();

      expect(preset()).toHaveTextContent("All presets");
    });

    /** Session counts help pick a preset worth filtering to; the "all" row has nothing to count. */
    it("counts the sessions behind each real preset", async () => {
      renderFilters();

      await userEvent.click(preset());

      expect(screen.getByRole("option", { name: "Mario Kart (3)" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "All presets" })).toBeInTheDocument();
    });

    it("reports the chosen preset", async () => {
      const { onPresetChange } = renderFilters();

      await userEvent.click(preset());
      await userEvent.click(screen.getByRole("option", { name: "Mario Kart (3)" }));

      expect(onPresetChange).toHaveBeenCalledWith("preset-1");
    });

    /** With only the "all" row there is nothing to choose between. */
    it("locks itself when there is only one option", () => {
      renderFilters({ presetOptions: [presetOptions[0]] });

      expect(preset()).toBeDisabled();
    });
  });

  /** Filtering a failed or in-flight load would just requery into the same state. */
  it("locks both filters while the page cannot be filtered", () => {
    renderFilters({ disabled: true });

    expect(dateRange()).toBeDisabled();
    expect(preset()).toBeDisabled();
  });
});
