import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "@/features/session/hooks/useSession";
import TriggerCountPanel from "./TriggerCountPanel";

// The session store is a singleton owned by the live-session module; the panel only reads it.
vi.mock("@/features/session/hooks/useSession", () => ({ useSession: vi.fn() }));

function stubSession(triggerCount: number) {
  vi.mocked(useSession).mockReturnValue({
    status: "running",
    startedAt: 0,
    endedAt: null,
    elapsedMs: 0,
    triggerCount,
    triggerCountsByMapping: {},
    endSession: vi.fn(),
    startSession: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TriggerCountPanel", () => {
  it("titles itself and says what is being counted", () => {
    stubSession(0);

    render(<TriggerCountPanel />);

    expect(screen.getByRole("heading", { name: "Successful Triggers" })).toBeInTheDocument();
    expect(screen.getByText("Movements that fired a keypress.")).toBeInTheDocument();
  });

  it("shows the running trigger count", () => {
    stubSession(12);

    render(<TriggerCountPanel />);

    expect(screen.getByText("12")).toBeInTheDocument();
  });

  /** Before the first movement fires, the panel reads zero rather than sitting blank. */
  it("shows zero before any movement has fired", () => {
    stubSession(0);

    render(<TriggerCountPanel />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
