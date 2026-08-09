import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPatients, type Patient } from "@/modules/patient-presets";
import { getDashboardOverview } from "@/modules/scheduling";
import MainDashboardPage from "./MainDashboardPage";
import { dashboardOverview, patient } from "./testDashboard";

// The modify dialog collects the edit; the page owns what happens to the table afterwards, so the
// dialog is replaced by one button per outcome it can report.
vi.mock("@/modules/patient-presets", () => ({ getPatients: vi.fn() }));
vi.mock("@/modules/scheduling", () => ({
  getDashboardOverview: vi.fn(),
  getLocalDayRange: () => ({ dayStartMs: 0, dayEndMs: 1 }),
}));
vi.mock("./components/AddPatientDialog", () => ({ default: () => null }));
vi.mock("./components/AddSessionDialog", () => ({ default: () => null }));
vi.mock("@/features/patients/components/ImportPatientButton", () => ({ default: () => null }));
vi.mock("@/features/patients/components/RecentPatientsTable", () => ({
  default: ({ patients, onModify }: { patients: Patient[]; onModify: (p: Patient) => void }) => (
    <ul>
      {patients.map((row) => (
        <li key={row.id}>
          <button type="button" onClick={() => onModify(row)}>
            modify {row.displayName}
          </button>
        </li>
      ))}
    </ul>
  ),
}));
vi.mock("@/features/patients/components/ModifyPatientDialog", () => ({
  default: ({
    patient: subject,
    onClose,
    onDeleted,
    onUpdated,
  }: {
    patient: Patient;
    onClose: () => void;
    onDeleted: (patientId: string) => void;
    onUpdated: (patient: Patient) => void;
  }) => (
    <div role="dialog" aria-label={`modifying ${subject.displayName}`}>
      <button type="button" onClick={onClose}>
        close
      </button>
      <button type="button" onClick={() => onDeleted(subject.id)}>
        confirm delete
      </button>
      <button type="button" onClick={() => onUpdated({ ...subject, displayName: "Alex Renamed" })}>
        confirm rename
      </button>
    </div>
  ),
}));

const listPatients = vi.mocked(getPatients);
const loadOverview = vi.mocked(getDashboardOverview);

async function openModifyDialog() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <MainDashboardPage />
    </MemoryRouter>,
  );
  await userEvent.click(await screen.findByRole("button", { name: "modify Alex Smith" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  listPatients.mockResolvedValue([patient()]);
  loadOverview.mockResolvedValue(dashboardOverview);
});

describe("MainDashboardPage patient modification", () => {
  it("opens the dialog for the chosen patient", async () => {
    await openModifyDialog();

    expect(screen.getByRole("dialog", { name: "modifying Alex Smith" })).toBeInTheDocument();
  });

  it("dismisses the dialog without touching the list", async () => {
    await openModifyDialog();

    await userEvent.click(screen.getByRole("button", { name: "close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(listPatients).toHaveBeenCalledTimes(1);
  });

  /** The row is dropped locally rather than refetched, but the counts still need refreshing. */
  it("drops a deleted patient and refreshes the overview", async () => {
    await openModifyDialog();

    await userEvent.click(screen.getByRole("button", { name: "confirm delete" }));

    expect(screen.queryByRole("button", { name: "modify Alex Smith" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(loadOverview).toHaveBeenCalledTimes(2);
  });

  it("replaces an updated patient and refreshes the overview", async () => {
    await openModifyDialog();

    await userEvent.click(screen.getByRole("button", { name: "confirm rename" }));

    expect(screen.getByRole("button", { name: "modify Alex Renamed" })).toBeInTheDocument();
    expect(loadOverview).toHaveBeenCalledTimes(2);
  });

  /** Only the edited row changes; the rest of the table must survive the swap intact. */
  it("leaves the other patients untouched when one is renamed", async () => {
    listPatients.mockResolvedValue([
      patient(),
      patient({ id: "patient-2", displayName: "Jo Lee" }),
    ]);
    await openModifyDialog();

    await userEvent.click(screen.getByRole("button", { name: "confirm rename" }));

    expect(screen.getByRole("button", { name: "modify Jo Lee" })).toBeInTheDocument();
  });
});
