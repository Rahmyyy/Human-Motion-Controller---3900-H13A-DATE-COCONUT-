import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

function renderPopover(props: React.ComponentProps<typeof Popover> = {}) {
  return render(
    <Popover {...props}>
      <PopoverTrigger>Pick a date</PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Session date</PopoverTitle>
          <PopoverDescription>Choose when the session runs.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>,
  );
}

describe("Popover", () => {
  it("stays closed until the trigger is used", () => {
    renderPopover();

    expect(screen.queryByText("Session date")).not.toBeInTheDocument();
  });

  it("opens on the trigger", async () => {
    renderPopover();

    await userEvent.click(screen.getByRole("button", { name: "Pick a date" }));

    expect(screen.getByText("Session date")).toBeInTheDocument();
    expect(screen.getByText("Choose when the session runs.")).toBeInTheDocument();
  });

  it("closes again on Escape", async () => {
    renderPopover({ defaultOpen: true });

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByText("Session date")).not.toBeInTheDocument();
  });

  it("reports state changes to a controlling parent", async () => {
    const onOpenChange = vi.fn();
    renderPopover({ open: true, onOpenChange });

    await userEvent.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  /** The content is portalled out of the trigger's DOM subtree so it escapes overflow clipping. */
  it("portals its content outside the trigger's subtree", () => {
    const { container } = renderPopover({ defaultOpen: true });

    const content = document.querySelector('[data-slot="popover-content"]');
    expect(content).toBeInTheDocument();
    expect(container.contains(content)).toBe(false);
  });

  it("marks the trigger, content, header, title, and description with their slots", () => {
    renderPopover({ defaultOpen: true });

    for (const slot of ["popover-trigger", "popover-content", "popover-header", "popover-title"]) {
      expect(document.querySelector(`[data-slot="${slot}"]`)).toBeInTheDocument();
    }
    expect(document.querySelector('[data-slot="popover-description"]')).toHaveTextContent(
      "Choose when the session runs.",
    );
  });

  it("merges caller class names into the content, header, title, and description", () => {
    render(
      <Popover defaultOpen>
        <PopoverContent className="content-class">
          <PopoverHeader className="header-class">
            <PopoverTitle className="title-class">Title</PopoverTitle>
            <PopoverDescription className="description-class">Body</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>,
    );

    for (const [slot, className] of [
      ["popover-content", "content-class"],
      ["popover-header", "header-class"],
      ["popover-title", "title-class"],
      ["popover-description", "description-class"],
    ]) {
      expect(document.querySelector(`[data-slot="${slot}"]`)).toHaveClass(className);
    }
  });

  /** An anchor lets the popover position against something other than its trigger. */
  it("renders an anchor the content can position against", () => {
    render(
      <Popover defaultOpen>
        <PopoverAnchor>anchor</PopoverAnchor>
        <PopoverContent>content</PopoverContent>
      </Popover>,
    );

    expect(document.querySelector('[data-slot="popover-anchor"]')).toHaveTextContent("anchor");
  });
});
