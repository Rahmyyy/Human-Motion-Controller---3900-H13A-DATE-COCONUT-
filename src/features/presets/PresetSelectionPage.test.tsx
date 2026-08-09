import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPatient } from "@/modules/patient-presets";
import { usePresetSelection } from "./hooks/usePresetSelection";
import PresetSelectionPage from "./PresetSelectionPage";
import { preset } from "./testPresets";

vi.mock("@/modules/patient-presets", () => ({ getPatient: vi.fn() }));
vi.mock("./hooks/usePresetSelection", () => ({ usePresetSelection: vi.fn() }));
vi.mock("./components/PresetPageHeader", () => ({
  default: ({ patientName }: { patientName: string }) => <h1>{patientName}</h1>,
}));
vi.mock("./components/PresetCollection", () => ({
  default: ({ presets }: { presets: unknown[] }) => (
    <div data-testid="collection" data-count={presets.length} />
  ),
}));
vi.mock("./components/PresetActionBar", () => ({
  default: ({ selectedPreset }: { selectedPreset?: { name: string } }) => (
    <div data-testid="action-bar" data-selected={selectedPreset?.name ?? "none"} />
  ),
}));

const loadPatient = vi.mocked(getPatient);

type Snapshot = ReturnType<typeof usePresetSelection>;

function renderPage(
  overrides: Partial<Snapshot> = {},
  state?: { patientName: unknown },
  pathname = "/patients/patient-1/presets",
) {
  vi.mocked(usePresetSelection).mockReturnValue({
    createError: null,
    deleteError: null,
    deletingPresetId: null,
    duplicateError: null,
    duplicatingPresetId: null,
    error: null,
    isCreating: false,
    isLoading: false,
    presets: [preset()],
    selectedPreset: null,
    selectedPresetId: null,
    clearCreateError: vi.fn(),
    clearDeleteError: vi.fn(),
    clearDuplicateError: vi.fn(),
    createPreset: vi.fn(() => Promise.resolve(null)),
    deletePreset: vi.fn(() => Promise.resolve(true)),
    duplicatePreset: vi.fn(() => Promise.resolve(null)),
    selectPreset: vi.fn(),
    ...overrides,
  });
  return render(
    <MemoryRouter initialEntries={[{ pathname, state }]}>
      <Routes>
        <Route path="/patients/:patientId/presets" element={<PresetSelectionPage />} />
        <Route path="/presets" element={<PresetSelectionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  loadPatient.mockResolvedValue({
    id: "patient-1",
    displayName: "Alex Smith",
    clinicalNotes: null,
    createdAt: "0",
    lastActivityAtMs: 0,
    presetCount: 1,
    status: "active",
  });
});

describe("PresetSelectionPage", () => {
  it("loads the presets for the patient in the route", () => {
    renderPage();

    expect(usePresetSelection).toHaveBeenCalledWith("patient-1");
    expect(screen.getByTestId("collection")).toHaveAttribute("data-count", "1");
  });

  describe("patient name", () => {
    it("uses the loaded patient's name", async () => {
      renderPage();

      expect(await screen.findByRole("heading", { name: "Alex Smith" })).toBeInTheDocument();
    });

    /** The name travels in router state so the header is not blank during the first load. */
    it("shows the name the previous screen passed while loading", () => {
      renderPage({}, { patientName: "Jo Lee" });

      expect(screen.getByRole("heading", { name: "Jo Lee" })).toBeInTheDocument();
    });

    /** A refresh loses the router state, so the header says it is still fetching. */
    it("says it is loading when nothing is known yet", () => {
      renderPage();

      expect(screen.getByRole("heading", { name: "Loading patient..." })).toBeInTheDocument();
    });

    /** Router state is untrusted input; a non-string must not reach the heading. */
    it("ignores a router state that is not a name", () => {
      renderPage({}, { patientName: 42 });

      expect(screen.getByRole("heading", { name: "Loading patient..." })).toBeInTheDocument();
    });

    /** A malformed link with no patient still has to render a heading. */
    it("falls back to a generic label without a patient in the route", () => {
      renderPage({}, undefined, "/presets");

      expect(screen.getByRole("heading", { name: "Patient" })).toBeInTheDocument();
      expect(loadPatient).not.toHaveBeenCalled();
    });

    /** A failed name lookup must not blank the page; the presets still load. */
    it("keeps the presets when the patient lookup fails", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      loadPatient.mockRejectedValue(new Error("patient deleted"));

      renderPage();

      expect(screen.getByTestId("collection")).toBeInTheDocument();
      await vi.waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith("Failed to load patient", expect.any(Error)),
      );
    });

    /** Leaving mid-lookup must not push a name into an unmounted page. */
    it("drops a patient that arrives after the page unmounts", async () => {
      let resolve!: (value: Awaited<ReturnType<typeof getPatient>>) => void;
      loadPatient.mockReturnValue(new Promise((settle) => (resolve = settle)));

      renderPage().unmount();
      resolve({
        id: "patient-1",
        displayName: "Alex Smith",
        clinicalNotes: null,
        createdAt: "0",
        lastActivityAtMs: 0,
        presetCount: 1,
        status: "active",
      });

      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });
  });

  describe("preset list", () => {
    it("shows a loading note until the presets arrive", () => {
      renderPage({ isLoading: true });

      expect(screen.getByText("Loading presets...")).toBeInTheDocument();
      expect(screen.queryByTestId("collection")).not.toBeInTheDocument();
    });

    it("shows the load failure in place of the list", () => {
      renderPage({ error: "Failed to load presets." });

      expect(screen.getByText("Failed to load presets.")).toBeInTheDocument();
      expect(screen.queryByTestId("collection")).not.toBeInTheDocument();
    });

    it("labels the list region", () => {
      renderPage();

      expect(screen.getByRole("region", { name: "Saved presets" })).toBeInTheDocument();
    });
  });

  describe("action bar", () => {
    it("acts on the selected preset", () => {
      renderPage({ selectedPreset: preset() });

      expect(screen.getByTestId("action-bar")).toHaveAttribute("data-selected", "Mario Kart");
    });

    it("reports nothing selected when no preset is chosen", () => {
      renderPage();

      expect(screen.getByTestId("action-bar")).toHaveAttribute("data-selected", "none");
    });
  });
});
