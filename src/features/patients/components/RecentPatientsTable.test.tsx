import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Patient } from "@/modules/patient-presets";
import { patient } from "../testPatients";
import RecentPatientsTable from "./RecentPatientsTable";

// The row menu has its own suite; a plain button keeps the row's own handlers observable here.
vi.mock("./PatientActionsMenu", () => ({
  default: ({ onModify, patient }: { onModify: (p: Patient) => void; patient: Patient }) => (
    <button type="button" onClick={() => onModify(patient)}>
      modify {patient.displayName}
    </button>
  ),
}));

function renderTable(patients = [patient()]) {
  const onModify = vi.fn();
  const onSelect = vi.fn();
  render(<RecentPatientsTable patients={patients} onModify={onModify} onSelect={onSelect} />);
  return { onModify, onSelect };
}

const rows = () => screen.getAllByRole("row").slice(1);
const dateOf = (lastActivityAtMs: number) =>
  new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(
    lastActivityAtMs,
  );

describe("RecentPatientsTable", () => {
  it("titles the table and heads every column", () => {
    renderTable();

    expect(screen.getByRole("heading", { name: "Recent Patients" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Patient",
      "Condition",
      "Last Activity",
      "Presets",
      "Status",
      "Actions",
    ]);
  });

  describe("a patient row", () => {
    it("shows the patient's details", () => {
      renderTable([patient({ clinicalNotes: "Stroke rehab" })]);

      const row = rows()[0];
      expect(within(row).getByText("Alex Smith")).toBeInTheDocument();
      expect(within(row).getByText("Stroke rehab")).toBeInTheDocument();
      expect(within(row).getByText("2")).toBeInTheDocument();
      expect(within(row).getByText(dateOf(patient().lastActivityAtMs))).toBeInTheDocument();
    });

    /** Notes are optional, and a blank cell would read as missing data rather than none given. */
    it("says the condition is unspecified when there are no notes", () => {
      renderTable();

      expect(screen.getByText("Not specified")).toBeInTheDocument();
    });

    it.each([
      ["active", "Active"],
      ["needsReview", "Needs Review"],
    ] as const)("shows the %s status as %s", (status, label) => {
      renderTable([patient({ status })]);

      expect(screen.getByText(label)).toBeInTheDocument();
    });

    describe("initials", () => {
      it("takes one letter from each of the first two names", () => {
        renderTable([patient({ displayName: "alex jordan smith" })]);

        expect(screen.getByText("AJ")).toBeInTheDocument();
      });

      it("falls back to a single letter for a one-word name", () => {
        renderTable([patient({ displayName: "Alex" })]);

        expect(screen.getByText("A")).toBeInTheDocument();
      });
    });
  });

  describe("opening a patient", () => {
    it("reports the clicked row", async () => {
      const { onSelect } = renderTable();

      await userEvent.click(screen.getByText("Alex Smith"));

      expect(onSelect).toHaveBeenCalledWith(patient());
    });

    /** Rows are keyboard reachable, so Enter has to do what a click does. */
    it("reports a row opened with Enter", async () => {
      const { onSelect } = renderTable();

      rows()[0].focus();
      await userEvent.keyboard("{Enter}");

      expect(onSelect).toHaveBeenCalledWith(patient());
    });

    it("ignores other keys on a row", async () => {
      const { onSelect } = renderTable();

      rows()[0].focus();
      await userEvent.keyboard("{ArrowDown}");

      expect(onSelect).not.toHaveBeenCalled();
    });

    it("reports a patient chosen from the row menu", async () => {
      const { onModify } = renderTable();

      await userEvent.click(screen.getByRole("button", { name: "modify Alex Smith" }));

      expect(onModify).toHaveBeenCalledWith(patient());
    });
  });

  describe("filtering", () => {
    const patients = [
      patient({ id: "patient-1", displayName: "Alex Smith" }),
      patient({ id: "patient-2", displayName: "Jo Lee", status: "needsReview" }),
    ];

    it("narrows the rows to the search term", async () => {
      renderTable(patients);

      await userEvent.type(screen.getByLabelText("Search patients"), "jo");

      expect(screen.getByText("Jo Lee")).toBeInTheDocument();
      expect(screen.queryByText("Alex Smith")).not.toBeInTheDocument();
    });

    it("narrows the rows to a status", async () => {
      renderTable(patients);

      await userEvent.click(screen.getByRole("combobox", { name: "Patient status" }));
      await userEvent.click(screen.getByRole("option", { name: "Needs Review" }));

      expect(screen.getByText("Jo Lee")).toBeInTheDocument();
      expect(screen.queryByText("Alex Smith")).not.toBeInTheDocument();
    });

    /** Activity ranges are relative to now, so a long-dormant patient drops out of a short one. */
    it("narrows the rows to an activity range", async () => {
      renderTable([patient({ lastActivityAtMs: new Date(2000, 0, 1).getTime() })]);

      await userEvent.click(screen.getByRole("combobox", { name: "Activity range" }));
      await userEvent.click(screen.getByRole("option", { name: "Last 7 Days" }));

      expect(
        screen.getByText("No patients match the current search and filter."),
      ).toBeInTheDocument();
    });

    it("says so when nothing matches", async () => {
      renderTable(patients);

      await userEvent.type(screen.getByLabelText("Search patients"), "nobody");

      expect(
        screen.getByText("No patients match the current search and filter."),
      ).toBeInTheDocument();
      expect(rows()).toHaveLength(0);
    });
  });
});
