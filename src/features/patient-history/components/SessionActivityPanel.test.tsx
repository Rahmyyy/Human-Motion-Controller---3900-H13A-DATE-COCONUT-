import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { activity } from "../testHistory";
import SessionActivityPanel from "./SessionActivityPanel";

function renderPanel(props: Partial<React.ComponentProps<typeof SessionActivityPanel>> = {}) {
  return render(
    <SessionActivityPanel
      activity={activity()}
      error={null}
      isLoading={false}
      onRetry={vi.fn()}
      onShowAllTime={vi.fn()}
      {...props}
    />,
  );
}

describe("SessionActivityPanel", () => {
  it("titles the panel and names both series", () => {
    renderPanel();

    expect(screen.getByText("Session activity")).toBeInTheDocument();
    expect(screen.getAllByText("Successful triggers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Duration").length).toBeGreaterThan(0);
  });

  it("labels the two axes", () => {
    renderPanel();

    expect(screen.getByText("Duration (min)")).toBeInTheDocument();
  });

  it("draws a chart from the activity points", () => {
    const { container } = renderPanel();

    expect(container.querySelector(".recharts-wrapper")).toBeInTheDocument();
  });

  // The tooltip's label formatter is not exercised here. Recharts only builds a tooltip payload
  // from a real hover, which it resolves against measured chart geometry; jsdom reports every
  // element as zero-sized, so the hover never lands on a point.

  /** Long histories are capped, and the clinician needs to know they are seeing a slice. */
  it("says how many sessions were left out of a capped chart", () => {
    renderPanel({ activity: activity({ truncatedFrom: 46 }) });

    expect(screen.getByText("Showing the 1 most recent of 46 sessions.")).toBeInTheDocument();
  });

  it("says nothing about truncation when the whole range fits", () => {
    renderPanel();

    expect(screen.queryByText(/most recent of/)).not.toBeInTheDocument();
  });

  it("says so when the range holds no sessions", () => {
    renderPanel({ activity: activity({ points: [] }) });

    expect(screen.getByText("No sessions in this range.")).toBeInTheDocument();
  });

  it("shows the load failure in place of the chart", () => {
    const { container } = renderPanel({ error: "Failed to load sessions." });

    expect(screen.getByText("Failed to load sessions.")).toBeInTheDocument();
    expect(container.querySelector(".recharts-wrapper")).not.toBeInTheDocument();
  });

  /** The legend explains the chart, so it goes away with the chart. */
  it("drops the legend when there is no chart to explain", () => {
    renderPanel({ activity: activity({ points: [] }) });

    expect(screen.queryByText("Duration (min)")).not.toBeInTheDocument();
  });
});
