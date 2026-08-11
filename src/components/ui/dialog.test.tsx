import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

/** Radix requires a title for the dialog to be accessibly named, so every case includes one. */
function renderDialog({
  showCloseButton,
  footerProps,
  ...rootProps
}: Partial<React.ComponentProps<typeof Dialog>> & {
  showCloseButton?: boolean;
  footerProps?: React.ComponentProps<typeof DialogFooter>;
} = {}) {
  return render(
    <Dialog {...rootProps}>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>Delete patient</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter {...footerProps}>
          <DialogClose>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
  );
}

describe("Dialog", () => {
  it("stays closed until the trigger is used", () => {
    renderDialog();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  it("opens on the trigger with its title and description announced", async () => {
    renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    const dialog = screen.getByRole("dialog", { name: "Delete patient" });
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
  });

  it("closes again when the close affordance is used", async () => {
    renderDialog({ defaultOpen: true });

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reports open and closed state to a controlling parent", async () => {
    const onOpenChange = vi.fn();
    renderDialog({ open: true, onOpenChange });

    await userEvent.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  describe("close button", () => {
    /** Most dialogs are dismissible, so the corner close button is on by default. */
    it("renders a labelled corner close button by default", async () => {
      renderDialog({ defaultOpen: true });

      const close = screen.getByRole("button", { name: "Close" });
      await userEvent.click(close);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    /** Dialogs that force a choice hide it so the only way out is an explicit action. */
    it("can be suppressed for a dialog that demands a decision", () => {
      renderDialog({ defaultOpen: true, showCloseButton: false });

      expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    /** The footer's own Close is opt-in, so a dialog does not get two of them by accident. */
    it("adds no second close button to the footer by default", () => {
      renderDialog({ defaultOpen: true });

      expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(1);
    });

    it("can add an explicit Close button to the footer", async () => {
      renderDialog({ defaultOpen: true, footerProps: { showCloseButton: true } });

      const closeButtons = screen.getAllByRole("button", { name: "Close" });
      expect(closeButtons).toHaveLength(2);
      await userEvent.click(closeButtons[1]);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("parts", () => {
    it("marks the content, header, footer, title, and description with their slots", () => {
      renderDialog({ defaultOpen: true });

      for (const slot of ["dialog-content", "dialog-header", "dialog-footer", "dialog-title"]) {
        expect(document.querySelector(`[data-slot="${slot}"]`)).toBeInTheDocument();
      }
      expect(document.querySelector('[data-slot="dialog-description"]')).toHaveTextContent(
        "This cannot be undone.",
      );
    });

    it("merges caller class names into the content, header, footer, title, and description", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent className="content-class">
            <DialogHeader className="header-class">
              <DialogTitle className="title-class">Title</DialogTitle>
              <DialogDescription className="description-class">Body</DialogDescription>
            </DialogHeader>
            <DialogFooter className="footer-class" />
          </DialogContent>
        </Dialog>,
      );

      for (const [slot, className] of [
        ["dialog-content", "content-class"],
        ["dialog-header", "header-class"],
        ["dialog-title", "title-class"],
        ["dialog-description", "description-class"],
        ["dialog-footer", "footer-class"],
      ]) {
        expect(document.querySelector(`[data-slot="${slot}"]`)).toHaveClass(className);
      }
    });

    /** The overlay and portal are exported for screens that lay out their own dialog shell. */
    it("renders a standalone overlay through the portal", () => {
      const { container } = render(
        <Dialog defaultOpen>
          <DialogPortal>
            <DialogOverlay className="overlay-class" />
          </DialogPortal>
        </Dialog>,
      );

      const overlay = document.querySelector('[data-slot="dialog-overlay"]');
      expect(overlay).toHaveClass("overlay-class");
      expect(container.contains(overlay)).toBe(false);
    });
  });
});
