import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPatients, type Patient } from "@/modules/patient-presets";
import { getDashboardOverview } from "@/modules/scheduling";
import MainDashboardPage from "./MainDashboardPage";
import { dashboardOverview, patient } from "./testDashboard";

// Each child that can change the underlying data is replaced by a button that fires its callback,
// so the tests are about what the page reloads rather than how the child collects its input.
vi.mock("@/modules/patient-presets", () => ({ getPatients: vi.fn() }));
vi.mock("@/modules/scheduling", () => ({
  getDashboardOverview: vi.fn(),
  getLocalDayRange: () => ({ dayStartMs: 0, dayEndMs: 1 }),
}));
vi.mock("@/features/patients/components/ModifyPatientDialog", () => ({ default: () => null }));
vi.mock("@/features/patients/components/RecentPatientsTable", () => ({
  default: ({ patients }: { patients: Patient[] }) => (
    <ul>
      {patients.map((row) => (
        <li key={row.id}>row {row.displayName}</li>
      ))}
    </ul>
  ),
}));
vi.mock("./components/AddPatientDialog", () => ({
  default: ({ onPatientCreated }: { onPatientCreated: () => Promise<void> }) => (
    <button type="button" onClick={() => void onPatientCreated()}>
      create patient
    </button>
  ),
}));
vi.mock("./components/AddSessionDialog", () => ({
  default: ({ onSessionCreated }: { onSessionCreated: () => Promise<void> }) => (
    <button type="button" onClick={() => void onSessionCreated()}>
      schedule session
    </button>
  ),
}));
vi.mock("@/features/patients/components/ImportPatientButton", () => ({
  default: ({ onImported }: { onImported: () => Promise<void> }) => (
    <button type="button" onClick={() => void onImported()}>
      import patient
    </button>
  ),
}));

const listPatients = vi.mocked(getPatients);
const loadOverview = vi.mocked(getDashboardOverview);

async function renderLoadedPage() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <MainDashboardPage />
    </MemoryRouter>,
  );
  await screen.findByText("row Alex Smith");
}

beforeEach(() => {
  vi.clearAllMocks();
  listPatients.mockResolvedValue([patient()]);
  loadOverview.mockResolvedValue(dashboardOverview);
});

describe("MainDashboardPage refreshes", () => {
  /** A new patient changes both the table and the active-patient count. */
  it("reloads the patients and the overview after a patient is created", async () => {
    await renderLoadedPage();

    await userEvent.click(screen.getByRole("button", { name: "create patient" }));

    expect(listPatients).toHaveBeenCalledTimes(2);
    expect(loadOverview).toHaveBeenCalledTimes(2);
  });

  it("reloads the patients and the overview after an import", async () => {
    await renderLoadedPage();

    await userEvent.click(screen.getByRole("button", { name: "import patient" }));

    expect(listPatients).toHaveBeenCalledTimes(2);
    expect(loadOverview).toHaveBeenCalledTimes(2);
  });

  /** Scheduling touches the calendar only, so the patient list is left alone. */
  it("reloads only the overview after a session is scheduled", async () => {
    await renderLoadedPage();

    await userEvent.click(screen.getByRole("button", { name: "schedule session" }));

    expect(loadOverview).toHaveBeenCalledTimes(2);
    expect(listPatients).toHaveBeenCalledTimes(1);
  });

  describe("when a reload fails", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("reports a failed patient reload", async () => {
      await renderLoadedPage();
      listPatients.mockRejectedValue(new Error("database locked"));

      await userEvent.click(screen.getByRole("button", { name: "create patient" }));

      expect(await screen.findAllByText("Failed to load patients.")).toHaveLength(2);
    });

    it("reports a failed overview reload", async () => {
      await renderLoadedPage();
      loadOverview.mockRejectedValue(new Error("database locked"));

      await userEvent.click(screen.getByRole("button", { name: "schedule session" }));

      expect(await screen.findAllByText("Failed to load dashboard summary.")).toHaveLength(2);
    });
  });
});
