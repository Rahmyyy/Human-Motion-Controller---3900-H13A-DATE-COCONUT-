import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChartLegendContent, type ChartConfig } from "./chart";
import { renderInChart } from "./testChart";

const config: ChartConfig = {
  sessions: { label: "Sessions", color: "#2563eb" },
  triggers: { label: "Triggers", theme: { light: "#16a34a", dark: "#4ade80" } },
};

const payload = [
  { value: "sessions", dataKey: "sessions", color: "#2563eb" },
  { value: "triggers", dataKey: "triggers", color: "#16a34a" },
];

function renderLegend(props: Partial<React.ComponentProps<typeof ChartLegendContent>> = {}) {
  return renderInChart(config, <ChartLegendContent payload={payload} {...props} />);
}

describe("ChartLegendContent", () => {
  it("labels each series from the config rather than the raw data key", () => {
    renderLegend();

    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Triggers")).toBeInTheDocument();
  });

  it("renders nothing without a payload", () => {
    const { container } = renderLegend({ payload: [] });

    expect(container.querySelector(".gap-4")).toBeNull();
  });

  /** Recharts marks hidden series with type "none"; showing them would misexplain the chart. */
  it("leaves out entries the chart is not drawing", () => {
    renderLegend({ payload: [...payload, { value: "hidden", dataKey: "hidden", type: "none" }] });

    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
  });

  it("keys the config lookup off a caller-supplied name key", () => {
    renderLegend({
      payload: [{ value: "x", dataKey: "x", payload: { series: "triggers" } }],
      nameKey: "series",
    });

    expect(screen.getByText("Triggers")).toBeInTheDocument();
  });

  it("falls back to the swatch alone when a series is not in the config", () => {
    const { container } = renderLegend({ payload: [{ value: "unknown", dataKey: "unknown" }] });

    expect(container.querySelector(".h-2.w-2")).toBeInTheDocument();
    expect(screen.queryByText("Sessions")).not.toBeInTheDocument();
  });

  /** Recharts types the payload loosely, so an entry that is not an object must not throw. */
  it("survives a payload entry that carries no config to look up", () => {
    const { container } = renderLegend({ payload: ["unexpected" as unknown as { value: string }] });

    expect(container.querySelector(".gap-4")).toBeInTheDocument();
  });

  /** An entry with no data key of its own still has to resolve to some config lookup. */
  it("falls back to the value key when an entry has no data key", () => {
    const { container } = renderLegend({ payload: [{ value: "sessions" }] });

    expect(container.querySelector(".gap-4")).toBeInTheDocument();
  });

  it("draws a swatch in the series colour", () => {
    const { container } = renderLegend();

    expect(container.querySelector('div[style*="rgb(37, 99, 235)"]')).toBeInTheDocument();
  });

  it("renders a series icon in place of the swatch when the config supplies one", () => {
    renderInChart(
      { sessions: { label: "Sessions", icon: () => <i>icon</i> } },
      <ChartLegendContent payload={[{ value: "sessions", dataKey: "sessions" }]} />,
    );

    expect(screen.getByText("icon")).toBeInTheDocument();
  });

  it("falls back to the swatch when icons are suppressed", () => {
    renderInChart(
      { sessions: { label: "Sessions", icon: () => <i>icon</i> } },
      <ChartLegendContent hideIcon payload={[{ value: "sessions", dataKey: "sessions" }]} />,
    );

    expect(screen.queryByText("icon")).not.toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  /** A legend above the chart needs its spacing below it, and vice versa. */
  it("moves its spacing above the chart when placed on top", () => {
    const { container } = renderLegend({ verticalAlign: "top" });

    expect(container.querySelector(".pb-3")).toBeInTheDocument();
    expect(container.querySelector(".pt-3")).toBeNull();
  });

  it("spaces itself below the chart by default", () => {
    const { container } = renderLegend();

    expect(container.querySelector(".pt-3")).toBeInTheDocument();
  });

  it("merges a caller's class name with its own", () => {
    const { container } = renderLegend({ className: "legend-class" });

    expect(container.querySelector(".legend-class")).toBeInTheDocument();
  });
});

describe("useChart", () => {
  /** Every chart part reads its config from context, so using one outside is a wiring bug. */
  it("refuses to render a legend outside a chart container", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ChartLegendContent payload={[]} />)).toThrow(
      "useChart must be used within a <ChartContainer />",
    );

    consoleError.mockRestore();
  });
});
