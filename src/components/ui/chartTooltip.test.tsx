import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderTooltip, tooltipEntry, tooltipItem as item } from "./testChart";

describe("ChartTooltipContent", () => {
  describe("visibility", () => {
    it("renders nothing while the tooltip is inactive", () => {
      renderTooltip({ active: false });

      expect(screen.queryByText("Sessions")).not.toBeInTheDocument();
    });

    it("renders nothing when there is no data under the cursor", () => {
      renderTooltip({ payload: [] });

      expect(screen.queryByText("Sessions")).not.toBeInTheDocument();
    });

    /** Recharts keeps hidden series in the payload marked "none"; they are not part of the hover. */
    it("leaves out series the chart is not drawing", () => {
      renderTooltip({ payload: [item, tooltipEntry({ name: "hidden", type: "none", value: 9 })] });

      expect(screen.queryByText("9")).not.toBeInTheDocument();
    });
  });

  describe("entries", () => {
    it("labels the series from the config and formats its value", () => {
      renderTooltip({ hideLabel: true });

      expect(screen.getByText("Sessions")).toBeInTheDocument();
      expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    it("falls back to the raw series name when the config has no label", () => {
      renderTooltip({ payload: [tooltipEntry({ dataKey: "unknown", name: "unknown" })] });

      expect(screen.getByText("unknown")).toBeInTheDocument();
    });

    it("prints a non-numeric value as-is", () => {
      renderTooltip({ payload: [tooltipEntry({ value: "n/a" })] });

      expect(screen.getByText("n/a")).toBeInTheDocument();
    });

    /** A gap in the series has no value to show, so the value column is left off entirely. */
    it("omits the value column for a missing measurement", () => {
      const { container } = renderTooltip({ payload: [tooltipEntry({ value: undefined })] });

      expect(container.querySelector(".font-mono")).toBeNull();
    });

    it("hands the value to a caller-supplied formatter", () => {
      const formatter = vi.fn(() => <span>7 minutes</span>);
      renderTooltip({ formatter });

      expect(screen.getByText("7 minutes")).toBeInTheDocument();
      expect(formatter).toHaveBeenCalledWith(1234, "sessions", item, 0, undefined);
    });

    it("keys the config lookup off a caller-supplied name key", () => {
      renderTooltip({ nameKey: "series", payload: [tooltipEntry({ series: "march" })] });

      expect(screen.getByText("March")).toBeInTheDocument();
    });

    /** An entry with neither name nor data key still has to resolve to some config lookup. */
    it("falls back to the value key when an entry is unnamed", () => {
      const { container } = renderTooltip({
        payload: [tooltipEntry({ dataKey: undefined, name: undefined, value: 5 })],
      });

      expect(container.querySelector(".font-mono")).toHaveTextContent("5");
    });
  });

  describe("label", () => {
    it("resolves a string label through the config", () => {
      renderTooltip({ label: "march" });

      expect(screen.getByText("March")).toBeInTheDocument();
    });

    it("shows an unconfigured string label unchanged", () => {
      renderTooltip({ label: "Week 3" });

      expect(screen.getByText("Week 3")).toBeInTheDocument();
    });

    it("can be suppressed entirely", () => {
      renderTooltip({ label: "march", hideLabel: true });

      expect(screen.queryByText("March")).not.toBeInTheDocument();
    });

    it("hands the label and payload to a caller-supplied formatter", () => {
      const labelFormatter = vi.fn(() => "Formatted");
      renderTooltip({ label: "march", labelFormatter });

      expect(screen.getByText("Formatted")).toBeInTheDocument();
      expect(labelFormatter).toHaveBeenCalledWith("March", [item]);
    });

    /** With a labelKey the label comes from the config entry it names, not from the label prop. */
    it("resolves the label from a caller-supplied label key", () => {
      renderTooltip({ label: "ignored", labelKey: "march" });

      expect(screen.getByText("March")).toBeInTheDocument();
    });

    /** A non-string label (a timestamp, say) cannot index the config, so the series names it. */
    it("takes the label from the series when the label prop is not a string", () => {
      renderTooltip({ label: 7 });

      expect(screen.getAllByText("Sessions")).toHaveLength(2);
    });

    it("shows no label when nothing resolves to one", () => {
      const { container } = renderTooltip({ payload: [tooltipEntry({ dataKey: "unknown" })] });

      expect(container.querySelector("div.font-medium")).toBeNull();
    });

    /**
     * A single non-dot entry nests the label beside its indicator instead of stacking it above,
     * which keeps a one-series tooltip compact.
     */
    it("nests the label next to a lone line-indicator entry", () => {
      const { container } = renderTooltip({ label: "march", indicator: "line" });

      expect(container.querySelector(".items-end")).toBeInTheDocument();
      expect(screen.getByText("March")).toBeInTheDocument();
    });

    it("stacks the label above when more than one series is hovered", () => {
      const { container } = renderTooltip({
        label: "march",
        indicator: "line",
        payload: [item, tooltipEntry({ name: "other" })],
      });

      expect(container.querySelector(".items-end")).toBeNull();
    });
  });
});
