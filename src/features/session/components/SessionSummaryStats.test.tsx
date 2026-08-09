import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SessionSummaryStats from "./SessionSummaryStats";

function renderStats(elapsedMs = 0, triggerCount = 0) {
  return render(<SessionSummaryStats elapsedMs={elapsedMs} triggerCount={triggerCount} />);
}

describe("SessionSummaryStats", () => {
  it("labels both figures", () => {
    renderStats();

    expect(screen.getByText("Session Duration")).toBeInTheDocument();
    expect(screen.getByText("Successful Triggers")).toBeInTheDocument();
  });

  it("shows the trigger count", () => {
    renderStats(0, 42);

    expect(screen.getByText("42")).toBeInTheDocument();
  });

  describe("duration", () => {
    it("shows minutes and seconds padded to two digits", () => {
      renderStats(65_000);

      expect(screen.getByText("01:05")).toBeInTheDocument();
    });

    /** Elapsed time arrives in milliseconds; part-seconds must round down, not up. */
    it("drops the part-second rather than rounding it up", () => {
      renderStats(1_999);

      expect(screen.getByText("00:01")).toBeInTheDocument();
    });

    it("keeps counting past an hour in minutes", () => {
      renderStats(3_723_000);

      expect(screen.getByText("62:03")).toBeInTheDocument();
    });

    /** A session that ended immediately still reads as a clock, not a blank. */
    it("shows a zeroed clock for an empty session", () => {
      renderStats();

      expect(screen.getByText("00:00")).toBeInTheDocument();
    });
  });
});
