import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPatients, type Patient } from "@/modules/patient-presets";
import { getDashboardOverview } from "@/modules/scheduling";
import MainDashboardPage from "./MainDashboardPage";
import { dashboardOverview, patient } from "./testDashboard";

// Everything the page composes is covered by its own suite; the mocks keep this one about the
// page's own job: loading the data and reporting what came back.
vi.mock("@/modules/patient-presets", () => ({ getPatients: vi.fn() }));
vi.mock("@/modules/scheduling", () => ({
  getDashboardOverview: vi.fn(),
  getLocalDayRange: () => ({ dayStartMs: 0, dayEndMs: 1 }),
}));
vi.mock("./components/AddPatientDialog", () => ({ default: () => null }));
vi.mock("./components/AddSessionDialog", () => ({ default: () => null }));
vi.mock("@/features/patients/components/ImportPatientButton", () => ({ default: () => null }));
vi.mock("@/features/patients/components/ModifyPatientDialog", () => ({ default: () => null }));
vi.mock("@/features/patients/components/RecentPatientsTable", () => ({
  default: ({ patients }: { patients: Patient[] }) => (
    <ul>
      {patients.map((row) => (
        <li key={row.id}>row {row.displayName}</li>
      ))}
      {patients.length === 0 && <li>empty patient list</li>}
    </ul>
  ),
}));

const listPatients = vi.mocked(getPatients);
const loadOverview = vi.mocked(getDashboardOverview);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <MainDashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listPatients.mockResolvedValue([patient()]);
  loadOverview.mockResolvedValue(dashboardOverview);
});

describe("MainDashboardPage", () => {
  it("greets the clinician and says what to do next", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Welcome back, Dr. Smith", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Select a patient to view their available preset mappings."),
    ).toBeInTheDocument();
  });

  describe("summary metrics", () => {
    it("shows the counts the overview reported", async () => {
      renderPage();

      const summary = await screen.findByRole("region", { name: "Dashboard summary" });
      expect(summary).toHaveTextContent("4Active Patients");
      expect(summary).toHaveTextContent("2Sessions Today");
    });

    /** Readiness is derived on the page from the patient list, not fetched with the overview. */
    it("counts the patients ready for a session", async () => {
      listPatients.mockResolvedValue([patient(), patient({ id: "patient-2", presetCount: 0 })]);

      renderPage();

      expect(await screen.findByRole("region", { name: "Dashboard summary" })).toHaveTextContent(
        "1Patients Ready",
      );
    });
  });

  describe("patient list", () => {
    it("shows a loading note until the patients arrive", () => {
      listPatients.mockReturnValue(new Promise(() => {}));

      renderPage();

      expect(screen.getAllByText("Loading patients...")).toHaveLength(2);
    });

    it("lists the patients once they arrive", async () => {
      renderPage();

      expect(await screen.findByText("row Alex Smith")).toBeInTheDocument();
    });

    it("passes an empty patient list to the table", async () => {
      listPatients.mockResolvedValue([]);

      renderPage();

      expect(await screen.findByText("empty patient list")).toBeInTheDocument();
    });
  });

  /** Navigating away mid-load must not push results into an unmounted page. */
  it("drops the initial load when the page unmounts first", async () => {
    let resolve!: (patients: Patient[]) => void;
    listPatients.mockReturnValue(new Promise((settle) => (resolve = settle)));

    renderPage().unmount();
    resolve([patient()]);

    expect(screen.queryByText("row Alex Smith")).not.toBeInTheDocument();
  });

  describe("when a load fails", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("reports a failed patient load", async () => {
      listPatients.mockRejectedValue(new Error("database locked"));

      renderPage();

      expect(await screen.findAllByText("Failed to load patients.")).toHaveLength(2);
    });

    /** The overview failing leaves the patient table usable, so its error sits on its own. */
    it("reports a failed overview load without hiding the patients", async () => {
      loadOverview.mockRejectedValue(new Error("database locked"));

      renderPage();

      expect(await screen.findAllByText("Failed to load dashboard summary.")).toHaveLength(2);
      expect(screen.getByText("row Alex Smith")).toBeInTheDocument();
    });
  });
});
