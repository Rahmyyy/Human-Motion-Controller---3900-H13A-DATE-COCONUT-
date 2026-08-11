import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { seriesColor } from "../charts/chartPalette";
import { thresholdSeries } from "../testHistory";
import ThresholdChangesPanel from "./ThresholdChangesPanel";

function renderPanel(props: Partial<React.ComponentProps<typeof ThresholdChangesPanel>> = {}) {
  return render(
    <ThresholdChangesPanel
      error={null}
      isLoading={false}
      onRetry={vi.fn()}
      onShowAllTime={vi.fn()}
      series={thresholdSeries()}
      {...props}
    />,
  );
}

describe("ThresholdChangesPanel", () => {
  it("titles the panel and says what it plots", () => {
    renderPanel();

    expect(screen.getByText("Threshold changes")).toBeInTheDocument();
    expect(
      screen.getByText("Movement thresholds used across completed sessions."),
    ).toBeInTheDocument();
    expect(screen.getByText("Threshold (%)")).toBeInTheDocument();
  });

  it("draws a chart from the threshold points", () => {
    const { container } = renderPanel();

    expect(container.querySelector(".recharts-wrapper")).toBeInTheDocument();
  });

  // As in the activity panel, the tooltip's label formatter needs a real hover against measured
  // chart geometry, which jsdom cannot provide.

  describe("legend", () => {
    it("names each plotted mapping", () => {
      renderPanel({
        series: thresholdSeries({
          mappings: [
            { id: "mapping-1", seriesKey: "mapping_1", label: "Left arm raise", colorIndex: 0 },
            { id: "mapping-2", seriesKey: "mapping_2", label: "Right kick", colorIndex: 1 },
          ],
        }),
      });

      expect(screen.getByText("Left arm raise")).toBeInTheDocument();
      expect(screen.getByText("Right kick")).toBeInTheDocument();
    });

    it("colours each mapping from the chart palette", () => {
      const { container } = renderPanel();

      const swatch = container.querySelector<HTMLElement>("li span[aria-hidden]");
      expect(swatch).toHaveStyle({ backgroundColor: seriesColor(0) });
    });
  });

  describe("when there is nothing to plot", () => {
    it("blames the empty range when no session ran", () => {
      renderPanel({ series: thresholdSeries({ mappings: [], points: [] }) });

      expect(screen.getByText("No sessions in this range.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Show all time" })).toBeInTheDocument();
    });

    /** Sessions on preset without mappings are a real state, and widening the range will not
     *  turn up thresholds that were never recorded. */
    it("explains mapping-less sessions and offers no wider range", () => {
      renderPanel({ series: thresholdSeries({ mappings: [] }) });

      expect(
        screen.getByText(
          "These sessions ran on presets without movement mappings, so there are no thresholds to plot.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Show all time" })).not.toBeInTheDocument();
    });
  });

  it("shows the load failure in place of the chart", () => {
    const { container } = renderPanel({ error: "Failed to load sessions." });

    expect(screen.getByText("Failed to load sessions.")).toBeInTheDocument();
    expect(container.querySelector(".recharts-wrapper")).not.toBeInTheDocument();
  });
});
