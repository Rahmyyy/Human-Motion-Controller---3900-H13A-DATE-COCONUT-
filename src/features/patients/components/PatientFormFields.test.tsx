import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PatientFormFields from "./PatientFormFields";

function renderFields(props: Partial<React.ComponentProps<typeof PatientFormFields>> = {}) {
  const handlers = {
    onClinicalNotesChange: vi.fn(),
    onDisplayNameChange: vi.fn(),
    onStatusChange: vi.fn(),
  };
  render(
    <PatientFormFields
      clinicalNotes=""
      displayName=""
      idPrefix="add-patient"
      status="active"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("PatientFormFields", () => {
  it("labels every field", () => {
    renderFields();

    expect(screen.getByLabelText("Patient Display Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Clinical Notes Optional")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument();
  });

  /** Two dialogs can be mounted at once, so the ids they generate must not collide. */
  it("namespaces its field ids with the caller's prefix", () => {
    renderFields({ idPrefix: "modify-patient" });

    expect(screen.getByLabelText("Patient Display Name")).toHaveAttribute(
      "id",
      "modify-patient-display-name",
    );
    expect(screen.getByLabelText("Clinical Notes Optional")).toHaveAttribute(
      "id",
      "modify-patient-clinical-notes",
    );
  });

  it("shows the values it was given", () => {
    renderFields({ displayName: "Alex Smith", clinicalNotes: "Stroke rehab" });

    expect(screen.getByLabelText("Patient Display Name")).toHaveValue("Alex Smith");
    expect(screen.getByLabelText("Clinical Notes Optional")).toHaveValue("Stroke rehab");
  });

  it("suggests what to type in each free-text field", () => {
    renderFields();

    expect(screen.getByPlaceholderText("e.g. Alex J.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Stroke rehab, upper body focus")).toBeInTheDocument();
  });

  /** The fields are controlled by the dialog above them, so edits are reported, not kept. */
  it("reports an edited display name", async () => {
    const { onDisplayNameChange } = renderFields({ displayName: "Ale" });

    await userEvent.type(screen.getByLabelText("Patient Display Name"), "x");

    expect(onDisplayNameChange).toHaveBeenCalledWith("Alex");
  });

  it("reports edited clinical notes", async () => {
    const { onClinicalNotesChange } = renderFields({ clinicalNotes: "Strok" });

    await userEvent.type(screen.getByLabelText("Clinical Notes Optional"), "e");

    expect(onClinicalNotesChange).toHaveBeenCalledWith("Stroke");
  });

  describe("status", () => {
    it("shows the current status", () => {
      renderFields({ status: "needsReview" });

      expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Needs Review");
    });

    it("offers both statuses", async () => {
      renderFields();

      await userEvent.click(screen.getByRole("combobox", { name: "Status" }));

      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Active",
        "Needs Review",
      ]);
    });

    it("reports the chosen status", async () => {
      const { onStatusChange } = renderFields();

      await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
      await userEvent.click(screen.getByRole("option", { name: "Needs Review" }));

      expect(onStatusChange).toHaveBeenCalledWith("needsReview");
    });
  });
});
