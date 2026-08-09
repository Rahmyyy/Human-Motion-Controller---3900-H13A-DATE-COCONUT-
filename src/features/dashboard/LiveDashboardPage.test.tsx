import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMovementMappings, type MovementMapping } from "@/modules/movement-mapping";
import LiveDashboardPage from "./LiveDashboardPage";

vi.mock("@/modules/movement-mapping", () => ({ getMovementMappings: vi.fn() }));
vi.mock("@/features/session/hooks/useSession", () => ({
  useSession: () => ({
    status: "idle" as const,
    startedAt: null,
    endedAt: null,
    elapsedMs: 0,
    triggerCount: 0,
    triggerCountsByMapping: {},
    endSession: vi.fn(),
    startSession: vi.fn(),
  }),
}));

const listMappings = vi.mocked(getMovementMappings);

const mapping: MovementMapping = {
  id: "mapping-1",
  name: "Left arm raise",
  keybind: "A",
  keypressType: "Click",
  poseFramesJson: "[]",
  selectedLandmarks: [],
  thresholdPercentage: 80,
  keypressTriggerThresholdPercentage: 80,
};

/** The second route reaches the page without a preset, the way a malformed link would. */
function renderPage(path = "/patients/patient-1/presets/preset-1/live") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/patients/:patientId/presets/:presetId/live" element={<LiveDashboardPage />} />
        <Route path="/patients/:patientId/live" element={<LiveDashboardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listMappings.mockResolvedValue([mapping]);
});

describe("LiveDashboardPage", () => {
  it("titles the page and says what it monitors", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Live Session Dashboard", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Monitor mappings, session duration, and triggers while a session is running.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the preset's saved mappings once they load", async () => {
    renderPage();

    expect(screen.getByText("Loading mappings.")).toBeInTheDocument();
    expect(await screen.findByText("Left arm raise")).toBeInTheDocument();
    expect(listMappings).toHaveBeenCalledWith("preset-1");
  });

  it("shows the session and trigger panels alongside the mappings", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Session Status" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Successful Triggers" })).toBeInTheDocument();
  });

  it("offers a way back to the recognition screen", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  describe("without a preset in the route", () => {
    it("reports the missing preset instead of fetching", () => {
      renderPage("/patients/patient-1/live");

      expect(screen.getByText("Preset not found.")).toBeInTheDocument();
      expect(listMappings).not.toHaveBeenCalled();
    });
  });

  describe("when the mappings fail to load", () => {
    it("shows the reason the load gave", async () => {
      listMappings.mockRejectedValue(new Error("preset was deleted"));

      renderPage();

      expect(await screen.findByText("preset was deleted")).toBeInTheDocument();
    });

    /** Tauri can reject with a bare string, which still has to reach the clinician. */
    it("shows a non-error rejection as text", async () => {
      listMappings.mockRejectedValue("something odd");

      renderPage();

      expect(await screen.findByText("something odd")).toBeInTheDocument();
    });
  });

  // Leaving the dashboard while the fetch is in flight must not touch the unmounted page.
  describe("when the page unmounts mid-load", () => {
    it("drops a late result", async () => {
      let resolve!: (mappings: MovementMapping[]) => void;
      listMappings.mockReturnValue(new Promise((settle) => (resolve = settle)));

      renderPage().unmount();
      resolve([mapping]);

      expect(await screen.queryByText("Left arm raise")).not.toBeInTheDocument();
    });

    it("drops a late failure", async () => {
      let reject!: (reason: unknown) => void;
      listMappings.mockReturnValue(new Promise((_, settle) => (reject = settle)));

      renderPage().unmount();
      reject(new Error("preset was deleted"));

      expect(await screen.queryByText("preset was deleted")).not.toBeInTheDocument();
    });
  });
});
