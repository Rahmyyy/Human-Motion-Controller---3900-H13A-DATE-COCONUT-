import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPatient } from "@/modules/patient-presets";
import AddPatientDialog from "./AddPatientDialog";

// Patient creation goes through Tauri; the dialog is tested against a stand-in repository.
vi.mock("@/modules/patient-presets", () => ({ createPatient: vi.fn() }));

const create = vi.mocked(createPatient);

async function openDialog() {
  const onPatientCreated = vi.fn(() => Promise.resolve());
  render(<AddPatientDialog onPatientCreated={onPatientCreated} />);
  await userEvent.click(screen.getByRole("button", { name: "Add Patient" }));
  return { onPatientCreated };
}

const nameField = () => screen.getByLabelText("Patient Display Name");
const submit = () => screen.getByRole("button", { name: "Create Patient" });

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue(undefined as never);
});

describe("AddPatientDialog", () => {
  it("opens the creation form from its trigger", async () => {
    await openDialog();

    expect(screen.getByRole("dialog", { name: "Add Patient" })).toBeInTheDocument();
    expect(
      screen.getByText("Create a new patient profile for preset selection."),
    ).toBeInTheDocument();
  });

  it("creates the patient from the entered details", async () => {
    await openDialog();

    await userEvent.type(nameField(), "Alex Smith");
    await userEvent.type(screen.getByLabelText("Clinical Notes Optional"), "Stroke rehab");
    await userEvent.click(submit());

    expect(create).toHaveBeenCalledWith("Alex Smith", "Stroke rehab", "active");
  });

  /** Stray whitespace around a typed name or note should never reach the database. */
  it("trims the entered details", async () => {
    await openDialog();

    await userEvent.type(nameField(), "  Alex Smith  ");
    await userEvent.type(screen.getByLabelText("Clinical Notes Optional"), "  Stroke rehab  ");
    await userEvent.click(submit());

    expect(create).toHaveBeenCalledWith("Alex Smith", "Stroke rehab", "active");
  });

  /** Notes are optional, and a blank box means "none recorded" rather than an empty note. */
  it("records no note when the notes box is blank", async () => {
    await openDialog();

    await userEvent.type(nameField(), "Alex Smith");
    await userEvent.click(submit());

    expect(create).toHaveBeenCalledWith("Alex Smith", undefined, "active");
  });

  it("creates the patient with the chosen status", async () => {
    await openDialog();

    await userEvent.type(nameField(), "Alex Smith");
    await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
    await userEvent.click(screen.getByRole("option", { name: "Needs Review" }));
    await userEvent.click(submit());

    expect(create).toHaveBeenCalledWith("Alex Smith", undefined, "needsReview");
  });

  it("refreshes the dashboard once the patient exists", async () => {
    const { onPatientCreated } = await openDialog();

    await userEvent.type(nameField(), "Alex Smith");
    await userEvent.click(submit());

    expect(onPatientCreated).toHaveBeenCalled();
  });

  /** Reopening the dialog must offer a blank form, not the patient just created. */
  it("closes and clears the form after creating", async () => {
    await openDialog();

    await userEvent.type(nameField(), "Alex Smith");
    await userEvent.click(submit());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add Patient" }));

    expect(nameField()).toHaveValue("");
  });

  it("refuses to create a patient with no display name", async () => {
    await openDialog();

    await userEvent.type(nameField(), "   ");
    await userEvent.click(submit());

    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  /** A failed save must keep the typed details on screen so nothing has to be retyped. */
  it("keeps the form open when creation fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValue(new Error("database locked"));
    const { onPatientCreated } = await openDialog();

    await userEvent.type(nameField(), "Alex Smith");
    await userEvent.click(submit());

    expect(nameField()).toHaveValue("Alex Smith");
    expect(onPatientCreated).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith("Failed to create patient", expect.any(Error));
  });
});
