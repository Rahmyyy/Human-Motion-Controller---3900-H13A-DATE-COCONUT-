import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSummaryContextLoader,
  type SessionSummary,
  type SummaryContextLoader,
  type SummaryContextSnapshot,
} from "@/modules/live-session";
import SessionSummaryView from "./SessionSummaryView";

// The loader belongs to the live-session module; the view only renders its snapshot.
vi.mock("@/modules/live-session", () => ({ createSummaryContextLoader: vi.fn() }));
vi.mock("./SessionSummaryStats", () => ({
  default: ({ elapsedMs, triggerCount }: { elapsedMs: number; triggerCount: number }) => (
    <div data-testid="stats" data-elapsed={elapsedMs} data-triggers={triggerCount} />
  ),
}));
vi.mock("./SessionSummaryMappingList", () => ({
  default: ({
    isLoading,
    loadError,
    rows,
  }: {
    isLoading: boolean;
    loadError: string | null;
    rows: unknown[];
  }) => (
    <div
      data-testid="mapping-list"
      data-loading={isLoading}
      data-error={loadError ?? "none"}
      data-rows={rows.length}
    />
  ),
}));

const summary: SessionSummary = {
  elapsedMs: 65_000,
  triggerCount: 7,
  triggerCountsByMapping: { "mapping-1": 7 },
};

const loading: SummaryContextSnapshot = { context: null, isLoading: true, loadError: null };

let listener: (() => void) | null;
let snapshot: SummaryContextSnapshot;
let loader: SummaryContextLoader;

function renderView(onDone = vi.fn()) {
  render(
    <SessionSummaryView
      onDone={onDone}
      patientId="patient-1"
      presetId="preset-1"
      summary={summary}
    />,
  );
  return { onDone };
}

function publish(next: SummaryContextSnapshot) {
  snapshot = next;
  act(() => listener?.());
}

beforeEach(() => {
  vi.clearAllMocks();
  listener = null;
  snapshot = loading;
  loader = {
    getSnapshot: () => snapshot,
    subscribe: (next: () => void) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    start: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(),
  };
  vi.mocked(createSummaryContextLoader).mockReturnValue(loader);
});

describe("SessionSummaryView", () => {
  it("titles the screen", () => {
    renderView();

    expect(screen.getByRole("heading", { name: "Session Summary", level: 1 })).toBeInTheDocument();
  });

  it("loads the context for the session that just ended", () => {
    renderView();

    expect(loader.start).toHaveBeenCalledWith("patient-1", "preset-1", summary);
  });

  it("shows the session's own figures without waiting for the load", () => {
    renderView();

    expect(screen.getByTestId("stats")).toHaveAttribute("data-elapsed", "65000");
    expect(screen.getByTestId("stats")).toHaveAttribute("data-triggers", "7");
  });

  describe("subtitle", () => {
    it("says it is still loading", () => {
      renderView();

      expect(screen.getByText("Loading session details…")).toBeInTheDocument();
    });

    it("names the preset and patient once loaded", () => {
      renderView();

      publish({
        context: { patientName: "Alex Smith", presetName: "Mario Kart", rows: [] },
        isLoading: false,
        loadError: null,
      });

      expect(screen.getByText("Mario Kart · Alex Smith")).toBeInTheDocument();
    });

    /** A failed context load still leaves a usable summary, so the subtitle falls back. */
    it("falls back to a generic line when the context never arrived", () => {
      renderView();

      publish({ context: null, isLoading: false, loadError: "Preset not found." });

      expect(
        screen.getByText("Review this session's outcome and adjust mappings as needed."),
      ).toBeInTheDocument();
    });
  });

  describe("mapping breakdown", () => {
    it("passes the loading state through while the context loads", () => {
      renderView();

      expect(screen.getByTestId("mapping-list")).toHaveAttribute("data-loading", "true");
      expect(screen.getByTestId("mapping-list")).toHaveAttribute("data-rows", "0");
    });

    it("passes the loaded rows through", () => {
      renderView();

      publish({
        context: {
          patientName: "Alex Smith",
          presetName: "Mario Kart",
          rows: [{ id: "mapping-1", name: "Left arm raise", keybind: "A", triggerCount: 7 }],
        },
        isLoading: false,
        loadError: null,
      });

      expect(screen.getByTestId("mapping-list")).toHaveAttribute("data-rows", "1");
    });

    it("passes a load failure through", () => {
      renderView();

      publish({ context: null, isLoading: false, loadError: "Preset not found." });

      expect(screen.getByTestId("mapping-list")).toHaveAttribute("data-error", "Preset not found.");
    });
  });

  it("reports the clinician finishing with the summary", async () => {
    const { onDone } = renderView();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onDone).toHaveBeenCalled();
  });

  it("disposes the loader when the summary unmounts", () => {
    const { unmount } = render(
      <SessionSummaryView
        onDone={vi.fn()}
        patientId="patient-1"
        presetId="preset-1"
        summary={summary}
      />,
    );

    unmount();

    expect(loader.dispose).toHaveBeenCalled();
  });
});
