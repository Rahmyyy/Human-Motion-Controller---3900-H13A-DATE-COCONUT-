import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPatients, type Patient } from "@/modules/patient-presets";
import { getDashboardOverview } from "@/modules/scheduling";
import MainDashboardPage from "./MainDashboardPage";
import { dashboardOverview, patient } from "./testDashboard";

// Every route out of the dashboard opens the same preset screen, so the tests assert the path and
// the patient name the destination is handed.
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
  default: ({ patients, onSelect }: { patients: Patient[]; onSelect: (p: Patient) => void }) => (
    <ul>
      {patients.map((row) => (
        <li key={row.id}>
          <button type="button" onClick={() => onSelect(row)}>
            open {row.displayName}
          </button>
        </li>
      ))}
    </ul>
  ),
}));

const listPatients = vi.mocked(getPatients);

/** Echoes what the destination route received so navigation can be asserted from the DOM. */
function Destination() {
  const location = useLocation();
  return (
    <p>
      arrived at {location.pathname} with {JSON.stringify(location.state)}
    </p>
  );
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<MainDashboardPage />} />
        <Route path="/patients/:patientId/presets" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listPatients.mockResolvedValue([patient()]);
  vi.mocked(getDashboardOverview).mockResolvedValue(dashboardOverview);
});

describe("MainDashboardPage navigation", () => {
  it("routes to the presets of the patient picked from the table", async () => {
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "open Alex Smith" }));

    expect(
      screen.getByText('arrived at /patients/patient-1/presets with {"patientName":"Alex Smith"}'),
    ).toBeInTheDocument();
  });

  it("routes to the presets of a patient scheduled for today", async () => {
    renderPage();

    await userEvent.click(await screen.findByText("Sam Diaz"));

    expect(
      screen.getByText('arrived at /patients/patient-9/presets with {"patientName":"Sam Diaz"}'),
    ).toBeInTheDocument();
  });

  it("routes to the presets of a patient flagged for review", async () => {
    listPatients.mockResolvedValue([
      patient({ id: "patient-3", displayName: "Jo Lee", status: "needsReview" }),
    ]);

    renderPage();

    await userEvent.click(await screen.findByText("Jo Lee"));

    expect(
      screen.getByText('arrived at /patients/patient-3/presets with {"patientName":"Jo Lee"}'),
    ).toBeInTheDocument();
  });
});
