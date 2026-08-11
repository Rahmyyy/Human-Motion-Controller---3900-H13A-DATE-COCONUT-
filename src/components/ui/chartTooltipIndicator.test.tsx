import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderTooltip, tooltipEntry } from "./testChart";

describe("ChartTooltipContent indicator", () => {
  it.each([
    ["dot", "h-2.5"],
    ["line", "w-1"],
    ["dashed", "border-dashed"],
  ] as const)("draws the %s indicator", (indicator, className) => {
    const { container } = renderTooltip({ indicator });

    expect(container.querySelector(`[class*="${className}"]`)).toBeInTheDocument();
  });

  /** A dashed indicator beside a nested label needs its own vertical centring. */
  it("centres a dashed indicator against a nested label", () => {
    const { container } = renderTooltip({ label: "march", indicator: "dashed" });

    expect(container.querySelector(".my-0\\.5")).toBeInTheDocument();
  });

  it("colours the indicator from the series", () => {
    const { container } = renderTooltip();

    expect(container.querySelector('[style*="--color-bg: #2563eb"]')).toBeInTheDocument();
  });

  /** Pie and bar slices carry their own fill, which must win over the series colour. */
  it("prefers the datum's own fill over the series colour", () => {
    const { container } = renderTooltip({ payload: [tooltipEntry({ payload: { fill: "#f00" } })] });

    expect(container.querySelector('[style*="--color-bg: #f00"]')).toBeInTheDocument();
  });

  it("lets a caller override the colour outright", () => {
    const { container } = renderTooltip({ color: "#0f0" });

    expect(container.querySelector('[style*="--color-bg: #0f0"]')).toBeInTheDocument();
  });

  it("can be hidden", () => {
    const { container } = renderTooltip({ hideIndicator: true });

    expect(container.querySelector('[style*="--color-bg"]')).toBeNull();
  });

  it("gives way to a series icon from the config", () => {
    renderTooltip({}, { sessions: { label: "Sessions", icon: () => <i>icon</i> } });

    expect(screen.getByText("icon")).toBeInTheDocument();
  });

  it("merges a caller's class name onto the tooltip and its label", () => {
    const { container } = renderTooltip({
      className: "tooltip-class",
      label: "march",
      labelClassName: "label-class",
    });

    expect(container.querySelector(".tooltip-class")).toBeInTheDocument();
    expect(container.querySelector(".label-class")).toHaveTextContent("March");
  });
});
