import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updatePatient, type Patient } from "@/modules/patient-presets";
import { patient } from "../testPatients";
import ModifyPatientDialog from "./ModifyPatientDialog";

vi.mock("@/modules/patient-presets", () => ({ updatePatient: vi.fn() }));
// Deletion has its own dialog and suite; here only the handover to it matters.
vi.mock("./DeletePatientDialog", () => ({
  default: ({ open, onDeleted }: { open: boolean; onDeleted: (patientId: string) => void }) =>
    open ? (
      <button type="button" onClick={() => onDeleted("patient-1")}>
        confirm delete
      </button>
    ) : null,
}));

const update = vi.mocked(updatePatient);

function renderDialog(subject: Patient = patient()) {
  const handlers = { onClose: vi.fn(), onDeleted: vi.fn(), onUpdated: vi.fn() };
  render(<ModifyPatientDialog patient={subject} {...handlers} />);
  return handlers;
}

const nameField = () => screen.getByLabelText("Patient Display Name");
const save = () => screen.getByRole("button", { name: /Sav/ });

beforeEach(() => {
  vi.clearAllMocks();
  update.mockImplementation((id, displayName) => Promise.resolve(patient({ id, displayName })));
});

describe("ModifyPatientDialog", () => {
  it("opens on the patient's saved details", () => {
    renderDialog(patient({ clinicalNotes: "Stroke rehab", status: "needsReview" }));

    expect(screen.getByRole("dialog", { name: "Modify Patient" })).toBeInTheDocument();
    expect(nameField()).toHaveValue("Alex Smith");
    expect(screen.getByLabelText("Clinical Notes Optional")).toHaveValue("Stroke rehab");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Needs Review");
  });

  /** A patient with no notes must open an empty box rather than the string "null". */
  it("opens with an empty notes box when the patient has none", () => {
    renderDialog();

    expect(screen.getByLabelText("Clinical Notes Optional")).toHaveValue("");
  });

  describe("saving", () => {
    it("saves the edited details, trimmed", async () => {
      const { onUpdated } = renderDialog();

      await userEvent.type(nameField(), "  ");
      await userEvent.click(save());

      expect(update).toHaveBeenCalledWith("patient-1", "Alex Smith", undefined, "active");
      expect(onUpdated).toHaveBeenCalled();
    });

    it("records the notes that were typed", async () => {
      renderDialog(patient({ clinicalNotes: "Stroke rehab" }));

      await userEvent.click(save());

      expect(update).toHaveBeenCalledWith("patient-1", "Alex Smith", "Stroke rehab", "active");
    });

    /** A nameless patient cannot be found again, so the save button refuses to arm. The handler
     *  repeats that check, but the disabled button means nothing can reach it. */
    it("cannot be saved without a display name", async () => {
      renderDialog();

      await userEvent.clear(nameField());

      expect(save()).toBeDisabled();
    });

    it("shows the reason a save failed", async () => {
      update.mockRejectedValue(new Error("name already taken"));
      const { onUpdated } = renderDialog();

      await userEvent.click(save());

      expect(await screen.findByRole("alert")).toHaveTextContent("name already taken");
      expect(onUpdated).not.toHaveBeenCalled();
    });

    it("falls back to a generic message for a non-error rejection", async () => {
      update.mockRejectedValue("something odd");
      renderDialog();

      await userEvent.click(save());

      expect(await screen.findByRole("alert")).toHaveTextContent("Failed to update patient.");
    });

    /** A second save mid-write would send the same edit twice. */
    it("locks the dialog while the save is in flight", async () => {
      let settle!: (updated: Patient) => void;
      update.mockReturnValue(new Promise<Patient>((resolve) => (settle = resolve)));
      renderDialog();

      await userEvent.click(save());

      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Delete Patient" })).toBeDisabled();
      settle(patient());
    });
  });

  describe("closing", () => {
    it("closes on cancel", async () => {
      const { onClose } = renderDialog();

      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onClose).toHaveBeenCalled();
    });

    it("closes when dismissed with the keyboard", async () => {
      const { onClose } = renderDialog();

      await userEvent.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalled();
    });

    /** Closing mid-write would hide an edit that is still going to land. */
    it("refuses to be dismissed while the save is in flight", async () => {
      let settle!: (updated: Patient) => void;
      update.mockReturnValue(new Promise<Patient>((resolve) => (settle = resolve)));
      const { onClose } = renderDialog();
      await userEvent.click(save());

      await userEvent.keyboard("{Escape}");

      expect(onClose).not.toHaveBeenCalled();
      settle(patient());
    });
  });

  describe("deleting", () => {
    it("hands over to the delete dialog", async () => {
      renderDialog();

      await userEvent.click(screen.getByRole("button", { name: "Delete Patient" }));

      expect(screen.getByRole("button", { name: "confirm delete" })).toBeInTheDocument();
    });

    it("reports the deletion up to the page", async () => {
      const { onDeleted } = renderDialog();

      await userEvent.click(screen.getByRole("button", { name: "Delete Patient" }));
      await userEvent.click(screen.getByRole("button", { name: "confirm delete" }));

      expect(onDeleted).toHaveBeenCalledWith("patient-1");
    });
  });
});
