import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletePatient } from "@/modules/patient-presets";
import { patient } from "../testPatients";
import DeletePatientDialog from "./DeletePatientDialog";

vi.mock("@/modules/patient-presets", () => ({ deletePatient: vi.fn() }));

const remove = vi.mocked(deletePatient);

function renderDialog(open = true) {
  const onDeleted = vi.fn();
  const onOpenChange = vi.fn();
  const view = render(
    <DeletePatientDialog
      onDeleted={onDeleted}
      onOpenChange={onOpenChange}
      open={open}
      patient={patient()}
    />,
  );
  return { onDeleted, onOpenChange, ...view };
}

const confirm = () => screen.getByRole("button", { name: "Delete Patient" });

/** Leaves the dialog mid-delete, with the write held open until the test releases it. */
async function renderDeleting() {
  let settle!: () => void;
  remove.mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));
  const view = renderDialog();

  await userEvent.click(confirm());

  return { ...view, settle };
}

beforeEach(() => {
  vi.clearAllMocks();
  remove.mockResolvedValue(undefined as never);
});

describe("DeletePatientDialog", () => {
  it("spells out everything the deletion takes with it", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Delete Patient?" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Delete “Alex Smith” and all of their presets and movement mappings? This cannot be undone.",
      ),
    ).toBeInTheDocument();
  });

  it("stays shut until it is asked to open", () => {
    renderDialog(false);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes the patient once confirmed", async () => {
    const { onDeleted } = renderDialog();

    await userEvent.click(confirm());

    expect(remove).toHaveBeenCalledWith("patient-1");
    expect(onDeleted).toHaveBeenCalledWith("patient-1");
  });

  it("closes without deleting when the clinician backs out", async () => {
    const { onDeleted, onOpenChange } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(remove).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes when dismissed with the keyboard", async () => {
    const { onOpenChange } = renderDialog();

    await userEvent.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  describe("when the delete fails", () => {
    it("shows the reason the database gave", async () => {
      remove.mockRejectedValue(new Error("patient has active sessions"));
      const { onDeleted } = renderDialog();

      await userEvent.click(confirm());

      expect(await screen.findByRole("alert")).toHaveTextContent("patient has active sessions");
      expect(onDeleted).not.toHaveBeenCalled();
    });

    /** Tauri can reject with a bare string, which still needs a readable message. */
    it("falls back to a generic message for a non-error rejection", async () => {
      remove.mockRejectedValue("something odd");
      renderDialog();

      await userEvent.click(confirm());

      expect(await screen.findByRole("alert")).toHaveTextContent("Failed to delete patient.");
    });

    // The dialog also clears a stale error when it is reopened, which is not tested here: `open`
    // is controlled by the parent, and a prop change does not run `onOpenChange`. Nothing inside
    // the dialog can reopen it, so that reset never fires from this component's own surface.
  });

  describe("while the delete is in flight", () => {
    /** A second confirm mid-delete would fire the same removal twice. */
    it("locks both controls", async () => {
      const { settle } = await renderDeleting();

      expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      settle();
    });

    /** Dismissing mid-write would hide a delete that is still going to land. */
    it("refuses to be dismissed", async () => {
      const { onOpenChange, settle } = await renderDeleting();

      await userEvent.keyboard("{Escape}");

      expect(onOpenChange).not.toHaveBeenCalled();
      settle();
    });
  });
});
