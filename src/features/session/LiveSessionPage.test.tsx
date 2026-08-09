import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionLauncherSnapshot, SessionSummary } from "@/modules/live-session";
import { useSessionLauncher } from "./hooks/useSessionLauncher";
import LiveSessionPage from "./LiveSessionPage";

vi.mock("./hooks/useSessionLauncher", () => ({ useSessionLauncher: vi.fn() }));
vi.mock("./components/SessionSummaryView", () => ({
  default: ({
    onDone,
    patientId,
    presetId,
  }: {
    onDone: () => void;
    patientId: string;
    presetId: string;
  }) => (
    <div data-testid="summary" data-patient-id={patientId} data-preset-id={presetId}>
      <button type="button" onClick={onDone}>
        finish
      </button>
    </div>
  ),
}));

const summary: SessionSummary = {
  elapsedMs: 65_000,
  triggerCount: 7,
  triggerCountsByMapping: {},
};

const endSession = vi.fn();

function Destination() {
  const location = useLocation();
  return <p>arrived at {location.pathname}</p>;
}

function renderPage(
  overrides: Partial<SessionLauncherSnapshot> = {},
  path = "/patients/patient-1/presets/preset-1/session",
) {
  vi.mocked(useSessionLauncher).mockReturnValue({
    error: null,
    status: "running",
    summary: null,
    endSession,
    ...overrides,
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/patients/:patientId/presets/:presetId/session"
          element={<LiveSessionPage />}
        />
        <Route path="/patients/:patientId/session" element={<LiveSessionPage />} />
        <Route path="/" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LiveSessionPage", () => {
  it("launches the session for the route it was opened on", () => {
    renderPage();

    expect(useSessionLauncher).toHaveBeenCalledWith("patient-1", "preset-1");
  });

  // The overlay window does the real work, so this page's job is to explain that and offer a
  // second way to stop.
  describe("while the session runs", () => {
    it("tells the clinician to switch to the game", () => {
      renderPage();

      expect(screen.getByText("Session running")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Switch to your game", level: 1 }),
      ).toBeInTheDocument();
    });

    it("offers a second way to end the session", async () => {
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: "End Session" }));

      expect(endSession).toHaveBeenCalled();
    });
  });

  describe("when the session cannot start", () => {
    it("shows the reason instead of the running copy", () => {
      renderPage({ error: "Preset has no default pose.", status: "error" });

      expect(
        screen.getByRole("heading", { name: "Session cannot start", level: 1 }),
      ).toBeInTheDocument();
      expect(screen.getByText("Preset has no default pose.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "End Session" })).not.toBeInTheDocument();
    });

    it("offers a way back", async () => {
      renderPage({ error: "Preset has no default pose.", status: "error" });

      await userEvent.click(screen.getByRole("button", { name: "Back to presets" }));

      expect(screen.getByText("arrived at /")).toBeInTheDocument();
    });
  });

  describe("once the session has ended", () => {
    it("shows the summary for the preset that ran", () => {
      renderPage({ status: "ended", summary });

      expect(screen.getByTestId("summary")).toHaveAttribute("data-patient-id", "patient-1");
      expect(screen.getByTestId("summary")).toHaveAttribute("data-preset-id", "preset-1");
    });

    it("returns to the dashboard when the clinician is done", async () => {
      renderPage({ status: "ended", summary });

      await userEvent.click(screen.getByRole("button", { name: "finish" }));

      expect(screen.getByText("arrived at /")).toBeInTheDocument();
    });

    /** An ended session with no figures has nothing to summarise. */
    it("keeps the running view when no summary arrived", () => {
      renderPage({ status: "ended", summary: null });

      expect(screen.queryByTestId("summary")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Switch to your game" })).toBeInTheDocument();
    });

    /** A malformed link with no preset cannot address a summary. */
    it("keeps the running view when the route has no preset", () => {
      renderPage({ status: "ended", summary }, "/patients/patient-1/session");

      expect(screen.queryByTestId("summary")).not.toBeInTheDocument();
    });
  });
});
