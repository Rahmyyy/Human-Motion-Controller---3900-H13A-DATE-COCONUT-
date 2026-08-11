import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RecordingCountdown from "./RecordingCountdown";

describe("RecordingCountdown", () => {
  it("shows the seconds remaining alongside the get-ready prompt", () => {
    render(<RecordingCountdown secondsRemaining={3} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Get ready")).toBeInTheDocument();
  });

  it("renders whatever count it is given", () => {
    const { rerender } = render(<RecordingCountdown secondsRemaining={2} />);
    expect(screen.getByText("2")).toBeInTheDocument();

    rerender(<RecordingCountdown secondsRemaining={1} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  /** The countdown sits over the live camera feed, so it must not swallow clicks meant for it. */
  it("does not intercept pointer events over the camera beneath it", () => {
    const { container } = render(<RecordingCountdown secondsRemaining={3} />);

    expect(container.firstElementChild).toHaveClass("pointer-events-none");
  });
});
