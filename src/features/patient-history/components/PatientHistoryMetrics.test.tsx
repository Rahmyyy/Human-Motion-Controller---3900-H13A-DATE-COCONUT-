import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HistorySummary } from "@/modules/patient-history";
import PatientHistoryMetrics from "./PatientHistoryMetrics";

const summary = (overrides: Partial<HistorySummary> = {}): HistorySummary => ({
  completedSessions: 8,
  totalDurationMs: 6_120_000,
  successfulTriggers: 96,
  averageTriggersPerSession: 12,
  ...overrides,
});

function renderMetrics(isLoading = false, overrides: Partial<HistorySummary> = {}) {
  return render(
    <PatientHistoryMetrics
      isLoading={isLoading}
      rangeLabel="Last 30 days"
      summary={summary(overrides)}
    />,
  );
}

const metrics = () => screen.getByRole("region", { name: "Session summary" });

describe("PatientHistoryMetrics", () => {
  it("summarises the filtered sessions in four cards", () => {
    renderMetrics();

    expect(within(metrics()).getByText("8")).toBeInTheDocument();
    expect(within(metrics()).getByText("Completed sessions")).toBeInTheDocument();
    expect(within(metrics()).getByText("96")).toBeInTheDocument();
    expect(within(metrics()).getByText("12")).toBeInTheDocument();
  });

  /** Total time is a duration, so it is spelled out rather than shown in milliseconds. */
  it("shows the total session time as hours and minutes", () => {
    renderMetrics();

    expect(within(metrics()).getByText("1h 42m")).toBeInTheDocument();
  });

  /** Only the session count depends on the range, so only that card is qualified by it. */
  it("qualifies the session count with the active range", () => {
    renderMetrics();

    expect(within(metrics()).getByText("Last 30 days")).toBeInTheDocument();
  });

  describe("while loading", () => {
    it("shows placeholders in place of the numbers", () => {
      const { container } = renderMetrics(true);

      expect(screen.queryByRole("region", { name: "Session summary" })).not.toBeInTheDocument();
      expect(container.querySelectorAll(".animate-pulse")).toHaveLength(12);
    });

    /** The placeholders carry no information, so they are not announced. */
    it("hides the placeholders from assistive technology", () => {
      const { container } = renderMetrics(true);

      expect(container.querySelector("section")).toHaveAttribute("aria-hidden", "true");
    });
  });
});
