import { render } from "@testing-library/react";
import { Line, LineChart } from "recharts";
import { describe, expect, it } from "vitest";
import { ChartContainer, ChartStyle, type ChartConfig } from "./chart";

const config: ChartConfig = {
  sessions: { label: "Sessions", color: "#2563eb" },
  triggers: { label: "Triggers", theme: { light: "#16a34a", dark: "#4ade80" } },
};

function renderContainer(props: Partial<React.ComponentProps<typeof ChartContainer>> = {}) {
  return render(
    <ChartContainer config={config} {...props}>
      <LineChart data={[{ sessions: 1 }]}>
        <Line dataKey="sessions" />
      </LineChart>
    </ChartContainer>,
  );
}

const chartRoot = (container: HTMLElement) => container.querySelector('[data-slot="chart"]')!;

describe("ChartContainer", () => {
  it("renders its chart inside a slot-marked wrapper", () => {
    const { container } = renderContainer();

    expect(chartRoot(container)).toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });

  /** The generated id scopes the injected CSS variables to this chart only. */
  it("generates a chart id when none is supplied", () => {
    const { container } = renderContainer();

    expect(chartRoot(container).getAttribute("data-chart")).toMatch(/^chart-/);
  });

  it("uses a caller-supplied id so the CSS variables are predictable", () => {
    const { container } = renderContainer({ id: "sessions" });

    expect(chartRoot(container)).toHaveAttribute("data-chart", "chart-sessions");
  });

  /** React's useId contains colons, which are invalid inside the CSS attribute selector. */
  it("strips colons out of the generated id", () => {
    const { container } = renderContainer();

    expect(chartRoot(container).getAttribute("data-chart")).not.toContain(":");
  });

  it("merges a caller's class name with its own", () => {
    const { container } = renderContainer({ className: "h-64" });

    expect(chartRoot(container)).toHaveClass("h-64");
    expect(chartRoot(container)).toHaveClass("aspect-video");
  });

  it("forwards arbitrary wrapper props", () => {
    const { container } = renderContainer({ role: "img", "aria-label": "Sessions over time" });

    expect(chartRoot(container)).toHaveAttribute("aria-label", "Sessions over time");
  });

  it("injects the config's colours as variables scoped to this chart", () => {
    const { container } = renderContainer({ id: "sessions" });

    const style = container.querySelector("style")!.innerHTML;
    expect(style).toContain("[data-chart=chart-sessions]");
    expect(style).toContain("--color-sessions: #2563eb;");
  });
});

describe("ChartStyle", () => {
  it("emits a rule per theme, picking the matching colour for each", () => {
    const { container } = render(<ChartStyle id="chart-1" config={config} />);

    const style = container.querySelector("style")!.innerHTML;
    expect(style).toContain("--color-triggers: #16a34a;");
    expect(style).toContain(".dark [data-chart=chart-1]");
    expect(style).toContain("--color-triggers: #4ade80;");
  });

  /** Series with no colour still belong in the config for their labels, but emit no variable. */
  it("skips series that declare no colour", () => {
    const { container } = render(
      <ChartStyle
        id="chart-1"
        config={{ sessions: { color: "#2563eb" }, plain: { label: "P" } }}
      />,
    );

    expect(container.querySelector("style")!.innerHTML).not.toContain("--color-plain");
  });

  /** A theme can leave one mode unstyled, which must drop that variable rather than emit an
   *  empty one that would override the inherited colour with nothing. */
  it("emits no variable for a theme mode that has no colour", () => {
    const { container } = render(
      <ChartStyle id="chart-1" config={{ sessions: { theme: { light: "", dark: "#4ade80" } } }} />,
    );

    const style = container.querySelector("style")!.innerHTML;
    expect(style).toContain("--color-sessions: #4ade80;");
    expect(style).not.toContain("--color-sessions: ;");
  });

  it("renders nothing when no series has a colour", () => {
    const { container } = render(<ChartStyle id="chart-1" config={{ plain: { label: "P" } }} />);

    expect(container.querySelector("style")).toBeNull();
  });
});
