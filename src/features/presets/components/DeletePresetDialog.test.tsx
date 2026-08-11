import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { preset } from "../testPresets";
import DeletePresetDialog from "./DeletePresetDialog";

function renderDialog(props: Partial<React.ComponentProps<typeof DeletePresetDialog>> = {}) {
  const onClearError = vi.fn();
  const onDelete = vi.fn(() => Promise.resolve(true));
  const { rerender } = render(
    <DeletePresetDialog
      error={null}
      isDeleting={false}
      onClearError={onClearError}
      onDelete={onDelete}
      preset={preset()}
      {...props}
    />,
  );
  return { onClearError, onDelete, rerender };
}

const trigger = () => screen.getByRole("button", { name: "Delete Mario Kart" });

describe("DeletePresetDialog", () => {
  it("offers deletion from an icon that names the preset", () => {
    renderDialog();

    expect(trigger()).toHaveAttribute("title", "Delete Mario Kart");
  });

  /** Losing a preset means losing its mappings, so the dialog counts them. */
  it("spells out what the deletion takes with it", async () => {
    renderDialog();

    await userEvent.click(trigger());

    expect(screen.getByRole("dialog", { name: "Delete preset?" })).toBeInTheDocument();
    expect(
      screen.getByText("Delete “Mario Kart” and its 3 mappings? This cannot be undone."),
    ).toBeInTheDocument();
  });

  it("uses the singular for a preset with one mapping", async () => {
    renderDialog({ preset: preset({ mappingCount: 1 }) });

    await userEvent.click(trigger());

    expect(
      screen.getByText("Delete “Mario Kart” and its 1 mapping? This cannot be undone."),
    ).toBeInTheDocument();
  });

  /** A failure from a previous attempt would be misleading on a fresh open. */
  it("clears a stale error when it opens", async () => {
    const { onClearError } = renderDialog();

    await userEvent.click(trigger());

    expect(onClearError).toHaveBeenCalled();
  });

  it("deletes the preset once confirmed", async () => {
    const { onDelete } = renderDialog();

    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("button", { name: "Delete preset" }));

    expect(onDelete).toHaveBeenCalledWith("preset-1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  /** A failed delete keeps the dialog open so the reason can be read. */
  it("stays open when the delete fails", async () => {
    const { onDelete } = renderDialog();
    onDelete.mockResolvedValue(false);

    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("button", { name: "Delete preset" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the reason the delete failed", async () => {
    renderDialog({ error: "Preset is in use by a running session." });

    await userEvent.click(trigger());

    expect(screen.getByRole("alert")).toHaveTextContent("Preset is in use by a running session.");
  });

  it("closes without deleting when the clinician backs out", async () => {
    const { onDelete } = renderDialog();

    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when dismissed with the keyboard", async () => {
    renderDialog();

    await userEvent.click(trigger());
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // The page owns the in-flight flag, so the dialog is opened first and then told a write began.
  describe("while the delete is in flight", () => {
    async function openThenStartDeleting() {
      const { rerender } = renderDialog();
      await userEvent.click(trigger());

      rerender(
        <DeletePresetDialog
          error={null}
          isDeleting
          onClearError={vi.fn()}
          onDelete={vi.fn(() => Promise.resolve(true))}
          preset={preset()}
        />,
      );
    }

    it("locks both controls", async () => {
      await openThenStartDeleting();

      expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    /** Dismissing mid-write would hide a delete that is still going to land. */
    it("refuses to be dismissed", async () => {
      await openThenStartDeleting();

      await userEvent.keyboard("{Escape}");

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
