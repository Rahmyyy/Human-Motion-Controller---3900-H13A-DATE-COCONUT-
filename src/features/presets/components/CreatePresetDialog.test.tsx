import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Preset } from "@/modules/patient-presets";
import { preset } from "../testPresets";
import CreatePresetDialog from "./CreatePresetDialog";

const created = preset({ id: "preset-9" });
const Destination = () => <p>arrived at {useLocation().pathname}</p>;

function renderDialog(props: Partial<React.ComponentProps<typeof CreatePresetDialog>> = {}) {
  const onClearError = vi.fn();
  const onCreate = vi.fn<(name: string) => Promise<Preset | null>>(async () => created);
  render(
    <MemoryRouter initialEntries={["/presets"]}>
      <Routes>
        <Route
          path="/presets"
          element={
            <CreatePresetDialog
              error={null}
              isCreating={false}
              onClearError={onClearError}
              onCreate={onCreate}
              patientId="patient-1"
              {...props}
            />
          }
        />
        <Route path="/patients/:patientId/presets/:presetId/edit" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
  return { onClearError, onCreate };
}

const openDialog = () => userEvent.click(screen.getByRole("button", { name: "Add Preset" }));
const chooseCustom = () =>
  userEvent.click(screen.getByRole("button", { name: /Create Custom Preset/ }));
const submit = () => screen.getByRole("button", { name: /Create Preset|Continue|Creating/ });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreatePresetDialog", () => {
  it("opens the creation form from its trigger", async () => {
    renderDialog();

    await openDialog();

    expect(screen.getByRole("dialog", { name: "Add Preset" })).toBeInTheDocument();
    expect(screen.getByText("Choose how you want to start.")).toBeInTheDocument();
  });

  /** A failure from a previous attempt would be misleading on a fresh open. */
  it("clears a stale error when it opens", async () => {
    const { onClearError } = renderDialog();

    await openDialog();

    expect(onClearError).toHaveBeenCalled();
  });

  it("shows the reason a creation failed", async () => {
    renderDialog({ error: "A preset with that name already exists." });

    await openDialog();

    expect(screen.getByText("A preset with that name already exists.")).toBeInTheDocument();
  });

  // The continue handler repeats the "can continue" check, but the disabled button means nothing
  // can reach it, so that guard is not exercised below.
  describe("before a start mode is chosen", () => {
    it("cannot continue", async () => {
      renderDialog();

      await openDialog();

      expect(submit()).toBeDisabled();
    });

    it("asks for no name yet", async () => {
      renderDialog();

      await openDialog();

      expect(screen.queryByLabelText("Name Your Preset")).not.toBeInTheDocument();
    });
  });

  describe("a custom preset", () => {
    it("asks for a name", async () => {
      renderDialog();

      await openDialog();
      await chooseCustom();

      expect(screen.getByLabelText("Name Your Preset")).toBeInTheDocument();
    });

    /** An unnamed preset cannot be told apart in the list, so the button stays disabled. */
    it("cannot be created until it is named", async () => {
      renderDialog();

      await openDialog();
      await chooseCustom();

      expect(submit()).toBeDisabled();
    });

    it("creates the preset with a trimmed name", async () => {
      const { onCreate } = renderDialog();

      await openDialog();
      await chooseCustom();
      await userEvent.type(screen.getByLabelText("Name Your Preset"), "  Tennis  ");
      await userEvent.click(submit());

      expect(onCreate).toHaveBeenCalledWith("Tennis");
    });

    /** A new preset is empty, so the clinician goes straight to adding its mappings. */
    it("opens the new preset's mappings", async () => {
      renderDialog();

      await openDialog();
      await chooseCustom();
      await userEvent.type(screen.getByLabelText("Name Your Preset"), "Tennis");
      await userEvent.click(submit());

      expect(
        await screen.findByText("arrived at /patients/patient-1/presets/preset-9/edit"),
      ).toBeInTheDocument();
    });

    it("stays put when the creation fails", async () => {
      const { onCreate } = renderDialog();
      onCreate.mockResolvedValue(null);

      await openDialog();
      await chooseCustom();
      await userEvent.type(screen.getByLabelText("Name Your Preset"), "Tennis");
      await userEvent.click(submit());

      expect(screen.queryByText(/arrived at/)).not.toBeInTheDocument();
    });

    it("locks the button while the preset is being created", async () => {
      renderDialog({ isCreating: true });

      await openDialog();
      await chooseCustom();
      await userEvent.type(screen.getByLabelText("Name Your Preset"), "Tennis");

      expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    });
  });

  /** Templates are not built yet; choosing one arms the button but creates nothing. */
  describe("a template preset", () => {
    it("can continue without a name", async () => {
      renderDialog();

      await openDialog();
      await userEvent.click(screen.getByRole("button", { name: /Use Existing Template/ }));

      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    });

    it("creates nothing yet", async () => {
      const { onCreate } = renderDialog();

      await openDialog();
      await userEvent.click(screen.getByRole("button", { name: /Use Existing Template/ }));
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(onCreate).not.toHaveBeenCalled();
    });
  });

  /** Reopening should offer a blank form, not the abandoned draft. */
  it("forgets the draft when dismissed", async () => {
    renderDialog();
    await openDialog();
    await chooseCustom();
    await userEvent.type(screen.getByLabelText("Name Your Preset"), "Tennis");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await openDialog();

    expect(screen.queryByLabelText("Name Your Preset")).not.toBeInTheDocument();
  });
});
