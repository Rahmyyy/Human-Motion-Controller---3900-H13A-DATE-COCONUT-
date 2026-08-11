import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MUTED_SERIES_COLOR, seriesColor } from "../charts/chartPalette";
import { presetUsage } from "../testHistory";
import PresetUsagePanel from "./PresetUsagePanel";

function renderPanel(props: Partial<React.ComponentProps<typeof PresetUsagePanel>> = {}) {
  return render(
    <PresetUsagePanel
      error={null}
      isLoading={false}
      onRetry={vi.fn()}
      onShowAllTime={vi.fn()}
      usage={presetUsage()}
      {...props}
    />,
  );
}

const swatches = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("li span[aria-hidden]"));

/** Counts and units are separate text nodes, so whole lines are matched by their element. */
const line = (text: string) =>
  screen.getByText(
    (_content, element) => element?.textContent === text && !element.children.length,
  );

describe("PresetUsagePanel", () => {
  it("titles the panel", () => {
    renderPanel();

    expect(screen.getByText("Preset usage")).toBeInTheDocument();
  });

  describe("headline preset", () => {
    it("names the most used preset with its counts", () => {
      renderPanel();

      expect(screen.getAllByText("Mario Kart")).toHaveLength(2);
      expect(line("3 sessions · 2 mappings")).toBeInTheDocument();
    });

    /** Counts of one must not read "1 sessions". */
    it("uses the singular for a single session and mapping", () => {
      renderPanel({
        usage: presetUsage({ topPresetSessionCount: 1, topPresetMappingCount: 1 }),
      });

      expect(line("1 session · 1 mapping")).toBeInTheDocument();
    });
  });

  describe("slice legend", () => {
    it("lists each slice with its share", () => {
      renderPanel();

      expect(line("3 (75%)")).toBeInTheDocument();
      expect(line("1 (25%)")).toBeInTheDocument();
      expect(screen.getByText("Other presets")).toBeInTheDocument();
    });

    it("colours each slice from the chart palette", () => {
      const { container } = renderPanel();

      expect(swatches(container)[0]).toHaveStyle({ backgroundColor: seriesColor(0) });
    });

    /** The folded remainder is not a preset of its own, so it is deliberately muted. */
    it("mutes the folded remainder", () => {
      const { container } = renderPanel();

      expect(swatches(container)[1]).toHaveStyle({ backgroundColor: MUTED_SERIES_COLOR });
    });
  });

  it("says so when no preset saw any use in the range", () => {
    renderPanel({ usage: presetUsage({ slices: [] }) });

    expect(screen.getByText("No preset activity in this range.")).toBeInTheDocument();
  });

  it("shows the load failure in place of the chart", () => {
    renderPanel({ error: "Failed to load sessions." });

    expect(screen.getByText("Failed to load sessions.")).toBeInTheDocument();
    expect(screen.queryByText("Mario Kart")).not.toBeInTheDocument();
  });
});
