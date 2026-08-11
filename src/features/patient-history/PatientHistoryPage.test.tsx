import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePatientHistory } from "./hooks/usePatientHistory";
import PatientHistoryPage from "./PatientHistoryPage";
import { activity, presetUsage, session, thresholdSeries } from "./testHistory";

vi.mock("./hooks/usePatientHistory", () => ({ usePatientHistory: vi.fn() }));
vi.mock("./components/PatientHistoryHeader", () => ({
  default: ({ patientName }: { patientName: string }) => <h1>{patientName}</h1>,
}));
vi.mock("./components/PatientHistoryEmptyState", () => ({
  default: () => <div data-testid="empty-state" />,
}));
vi.mock("./components/PatientHistoryFilters", () => ({
  default: ({ disabled }: { disabled: boolean }) => (
    <div data-testid="filters" data-disabled={disabled} />
  ),
}));
vi.mock("./components/PatientHistoryMetrics", () => ({
  default: ({ rangeLabel }: { rangeLabel: string }) => (
    <div data-testid="metrics" data-range-label={rangeLabel} />
  ),
}));
vi.mock("./components/SessionActivityPanel", () => ({
  default: ({ onShowAllTime }: { onShowAllTime: () => void }) => (
    <button type="button" onClick={onShowAllTime}>
      widen the range
    </button>
  ),
}));
vi.mock("./components/PresetUsagePanel", () => ({
  default: ({ onRetry }: { onRetry: () => void }) => (
    <button type="button" onClick={onRetry}>
      retry usage
    </button>
  ),
}));
vi.mock("./components/ThresholdChangesPanel", () => ({
  default: () => <div data-testid="thresholds" />,
}));
vi.mock("./components/CompletedSessionsTable", () => ({
  default: ({ sessions }: { sessions: unknown[] }) => (
    <div data-testid="sessions-table" data-count={sessions.length} />
  ),
}));

type Snapshot = ReturnType<typeof usePatientHistory>;

const setDateRange = vi.fn();
const retry = vi.fn();

function renderPage(overrides: Partial<Snapshot> = {}, state?: { patientName: string }) {
  vi.mocked(usePatientHistory).mockReturnValue({
    error: null,
    isLoading: false,
    patientName: "Alex Smith",
    filter: { dateRange: "30d", presetId: "all" },
    presetOptions: [],
    totalSessionCount: 4,
    sessions: [session()],
    summary: {
      completedSessions: 4,
      totalDurationMs: 0,
      successfulTriggers: 0,
      averageTriggersPerSession: 0,
    },
    activity: activity(),
    presetUsage: presetUsage(),
    thresholds: thresholdSeries(),
    retry,
    setDateRange,
    setPresetId: vi.fn(),
    ...overrides,
  });
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/patients/patient-1/history", state }]}>
      <Routes>
        <Route path="/patients/:patientId/history" element={<PatientHistoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PatientHistoryPage", () => {
  it("loads the history for the patient in the route", () => {
    renderPage();

    expect(usePatientHistory).toHaveBeenCalledWith("patient-1");
  });

  it("lays out the filters, metrics, charts, and table", () => {
    renderPage();

    expect(screen.getByTestId("filters")).toBeInTheDocument();
    expect(screen.getByTestId("metrics")).toHaveAttribute("data-range-label", "Last 30 days");
    expect(screen.getByTestId("thresholds")).toBeInTheDocument();
    expect(screen.getByTestId("sessions-table")).toHaveAttribute("data-count", "1");
  });

  describe("patient name", () => {
    it("uses the loaded patient's name", () => {
      renderPage();

      expect(screen.getByRole("heading", { name: "Alex Smith" })).toBeInTheDocument();
    });

    /** The name travels in router state so the header is not blank during the first load. */
    it("falls back to the name the previous screen passed", () => {
      renderPage({ patientName: null }, { patientName: "Jo Lee" });

      expect(screen.getByRole("heading", { name: "Jo Lee" })).toBeInTheDocument();
    });

    /** A refresh loses the router state, so the header still needs something to say. */
    it("falls back to a generic name when nothing is known", () => {
      renderPage({ patientName: null });

      expect(screen.getByRole("heading", { name: "selected patient" })).toBeInTheDocument();
    });
  });

  // A patient with no sessions at all gets an invitation, not four empty charts.
  describe("when the patient has no history", () => {
    it("shows the empty state in place of the panels", () => {
      renderPage({ totalSessionCount: 0 });

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(screen.queryByTestId("filters")).not.toBeInTheDocument();
    });

    /** Until the load finishes, zero sessions means "not known yet", not "none". */
    it("waits for the load before deciding there is none", () => {
      renderPage({ totalSessionCount: 0, isLoading: true });

      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
      expect(screen.getByTestId("filters")).toBeInTheDocument();
    });

    /** A failed load says nothing about whether history exists. */
    it("keeps the panels when the load failed", () => {
      renderPage({ totalSessionCount: 0, error: "Failed to load sessions." });

      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
      expect(screen.getByTestId("filters")).toBeInTheDocument();
    });
  });

  describe("filters", () => {
    it("locks while the history is loading", () => {
      renderPage({ isLoading: true });

      expect(screen.getByTestId("filters")).toHaveAttribute("data-disabled", "true");
    });

    it("locks while the history is in error", () => {
      renderPage({ error: "Failed to load sessions." });

      expect(screen.getByTestId("filters")).toHaveAttribute("data-disabled", "true");
    });
  });

  describe("panel actions", () => {
    /** Every panel offers the same escape hatch out of an over-narrow range. */
    it("widens the range to all time from any panel", async () => {
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: "widen the range" }));

      expect(setDateRange).toHaveBeenCalledWith("all");
    });

    it("retries the whole load from any panel", async () => {
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: "retry usage" }));

      expect(retry).toHaveBeenCalled();
    });
  });
});
