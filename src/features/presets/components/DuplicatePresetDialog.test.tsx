import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Preset } from "@/modules/patient-presets";
import { preset } from "../testPresets";
import DuplicatePresetDialog from "./DuplicatePresetDialog";

function renderDialog(props: Partial<React.ComponentProps<typeof DuplicatePresetDialog>> = {}) {
  const onClearError = vi.fn();
  const onDuplicate = vi.fn<(presetId: string) => Promise<Preset | null>>(() =>
    Promise.resolve(preset({ id: "preset-2" })),
  );
  const { rerender } = render(
    <DuplicatePresetDialog
      error={null}
      isDuplicating={false}
      onClearError={onClearError}
      onDuplicate={onDuplicate}
      preset={preset()}
      {...props}
    />,
  );
  return { onClearError, onDuplicate, rerender };
}

const trigger = () => screen.getByRole("button", { name: "Duplicate Mario Kart" });
const confirm = () => screen.getByRole("button", { name: "Duplicate preset" });

describe("DuplicatePresetDialog", () => {
  it("offers duplication from an icon that names the preset", () => {
    renderDialog();

    expect(trigger()).toHaveAttribute("title", "Duplicate Mario Kart");
  });

  /** The copy's name and mapping count are decided up front, so the dialog can show both. */
  it("says what the copy will be called and what it will contain", async () => {
    renderDialog();

    await userEvent.click(trigger());

    expect(screen.getByRole("dialog", { name: "Duplicate preset?" })).toBeInTheDocument();
    expect(screen.getByText("Create “Mario Kart (Copy)” with all 3 mappings?")).toBeInTheDocument();
  });

  /** A failure from a previous attempt would be misleading on a fresh open. */
  it("clears a stale error when it opens", async () => {
    const { onClearError } = renderDialog();

    await userEvent.click(trigger());

    expect(onClearError).toHaveBeenCalled();
  });

  it("duplicates the preset once confirmed", async () => {
    const { onDuplicate } = renderDialog();

    await userEvent.click(trigger());
    await userEvent.click(confirm());

    expect(onDuplicate).toHaveBeenCalledWith("preset-1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  /** A failed duplicate keeps the dialog open so the reason can be read. */
  it("stays open when the duplicate fails", async () => {
    const { onDuplicate } = renderDialog();
    onDuplicate.mockResolvedValue(null);

    await userEvent.click(trigger());
    await userEvent.click(confirm());

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the reason the duplicate failed", async () => {
    renderDialog({ error: "A preset with that name already exists." });

    await userEvent.click(trigger());

    expect(screen.getByText("A preset with that name already exists.")).toBeInTheDocument();
  });

  it("closes without duplicating when the clinician backs out", async () => {
    const { onDuplicate } = renderDialog();

    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDuplicate).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when dismissed with the keyboard", async () => {
    renderDialog();

    await userEvent.click(trigger());
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // The page owns the in-flight flag, so the dialog is opened first and then told a write began.
  describe("while the duplicate is in flight", () => {
    async function openThenStartDuplicating() {
      const { rerender } = renderDialog();
      await userEvent.click(trigger());

      rerender(
        <DuplicatePresetDialog
          error={null}
          isDuplicating
          onClearError={vi.fn()}
          onDuplicate={vi.fn(() => Promise.resolve(preset()))}
          preset={preset()}
        />,
      );
    }

    it("locks the confirm control", async () => {
      await openThenStartDuplicating();

      expect(screen.getByRole("button", { name: "Duplicating…" })).toBeDisabled();
    });

    /** Dismissing mid-write would hide a copy that is still going to be created. */
    it("refuses to be dismissed", async () => {
      await openThenStartDuplicating();

      await userEvent.keyboard("{Escape}");

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
