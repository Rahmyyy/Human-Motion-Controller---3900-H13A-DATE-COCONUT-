import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { session } from "../testHistory";
import CompletedSessionsTable from "./CompletedSessionsTable";

function renderTable(props: Partial<React.ComponentProps<typeof CompletedSessionsTable>> = {}) {
  render(
    <CompletedSessionsTable
      error={null}
      isLoading={false}
      onRetry={vi.fn()}
      onShowAllTime={vi.fn()}
      sessions={[session()]}
      {...props}
    />,
  );
}

describe("CompletedSessionsTable", () => {
  it("titles the panel and heads every column", () => {
    renderTable();

    expect(screen.getByText("Completed sessions")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Date",
      "Preset",
      "Duration",
      "Triggers",
    ]);
  });

  /** Raw epochs and milliseconds are unreadable, so both are formatted for the clinician. */
  it("shows a session with its date and duration spelled out", () => {
    renderTable();

    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("4 Aug 2026, 10:42 AM")).toBeInTheDocument();
    expect(within(row).getByText("Mario Kart")).toBeInTheDocument();
    expect(within(row).getByText("12m 36s")).toBeInTheDocument();
    expect(within(row).getByText("12")).toBeInTheDocument();
  });

  it("lists a row per session", () => {
    renderTable({ sessions: [session(), session({ id: "session-2", presetName: "Tennis" })] });

    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("says so when the range holds no sessions", () => {
    renderTable({ sessions: [] });

    expect(screen.getByText("No sessions in this range.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the load failure in place of the table", () => {
    renderTable({ error: "Failed to load sessions." });

    expect(screen.getByText("Failed to load sessions.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows a placeholder while the sessions load", () => {
    renderTable({ isLoading: true });

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
