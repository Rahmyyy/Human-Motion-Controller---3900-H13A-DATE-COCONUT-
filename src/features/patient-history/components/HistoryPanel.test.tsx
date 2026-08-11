import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HistoryPanel from "./HistoryPanel";

function renderPanel(props: Partial<React.ComponentProps<typeof HistoryPanel>> = {}) {
  const onRetry = vi.fn();
  const onShowAllTime = vi.fn();
  const { container } = render(
    <HistoryPanel
      error={null}
      isEmpty={false}
      isLoading={false}
      onRetry={onRetry}
      onShowAllTime={onShowAllTime}
      title="Session activity"
      {...props}
    >
      <p>the chart</p>
    </HistoryPanel>,
  );
  return { container, onRetry, onShowAllTime };
}

describe("HistoryPanel", () => {
  it("titles the panel and shows its body", () => {
    renderPanel();

    expect(screen.getByText("Session activity")).toBeInTheDocument();
    expect(screen.getByText("the chart")).toBeInTheDocument();
  });

  it("shows the description when one is given", () => {
    renderPanel({ description: "Showing the 20 most recent of 46 sessions." });

    expect(screen.getByText("Showing the 20 most recent of 46 sessions.")).toBeInTheDocument();
  });

  describe("while loading", () => {
    it("shows a placeholder in place of the body", () => {
      const { container } = renderPanel({ isLoading: true });

      expect(screen.queryByText("the chart")).not.toBeInTheDocument();
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    /** Each panel sizes its own placeholder so the page does not jump when the data lands. */
    it("sizes the placeholder to the body it will become", () => {
      const { container } = renderPanel({ isLoading: true, skeletonClassName: "h-[180px]" });

      expect(container.querySelector(".animate-pulse")).toHaveClass("h-[180px]");
    });
  });

  // One panel failing must not blank the page, so each explains itself and offers a way back.
  describe("on error", () => {
    it("shows the reason and a retry", async () => {
      const { onRetry } = renderPanel({ error: "Failed to load sessions." });

      expect(screen.getByText("Failed to load sessions.")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Retry" }));

      expect(onRetry).toHaveBeenCalled();
    });

    /** The error is the whole story; a stale chart underneath it would be misleading. */
    it("replaces the body", () => {
      renderPanel({ error: "Failed to load sessions." });

      expect(screen.queryByText("the chart")).not.toBeInTheDocument();
    });

    it("wins over an empty body", () => {
      renderPanel({ error: "Failed to load sessions.", isEmpty: true });

      expect(screen.getByText("Failed to load sessions.")).toBeInTheDocument();
      expect(screen.queryByText("No sessions in this range.")).not.toBeInTheDocument();
    });
  });

  describe("when empty", () => {
    it("says there is nothing in the range and offers to widen it", async () => {
      const { onShowAllTime } = renderPanel({ isEmpty: true });

      expect(screen.getByText("No sessions in this range.")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Show all time" }));

      expect(onShowAllTime).toHaveBeenCalled();
    });

    it("uses the caller's wording when it has better words", () => {
      renderPanel({ isEmpty: true, emptyMessage: "No preset activity in this range." });

      expect(screen.getByText("No preset activity in this range.")).toBeInTheDocument();
    });

    /** Widening the range does not always help, so a panel can decline to offer it. */
    it("offers no widening when the caller withholds it", () => {
      renderPanel({ isEmpty: true, onShowAllTime: undefined });

      expect(screen.queryByRole("button", { name: "Show all time" })).not.toBeInTheDocument();
    });
  });

  // The action is a legend for the body; with no body to read, it would explain nothing.
  describe("header action", () => {
    it("shows beside the title once there is a body", () => {
      renderPanel({ action: <span>legend</span> });

      expect(screen.getByText("legend")).toBeInTheDocument();
    });

    it.each([
      ["loading", { isLoading: true }],
      ["failed", { error: "Failed to load sessions." }],
      ["empty", { isEmpty: true }],
    ])("stays hidden while the panel is %s", (_state, props) => {
      renderPanel({ action: <span>legend</span>, ...props });

      expect(screen.queryByText("legend")).not.toBeInTheDocument();
    });
  });
});
