import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { buttonVariants } from "./button-variants";

describe("Button", () => {
  it("renders its children inside a real button element", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" }).tagName).toBe("BUTTON");
  });

  it("calls its click handler", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });

  /** The data attributes are what the Tailwind variant selectors and tests hang off. */
  it("marks itself with the default variant and size when none is chosen", () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button).toHaveAttribute("data-size", "default");
  });

  it("records the chosen variant and size", () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-variant", "destructive");
    expect(button).toHaveAttribute("data-size", "sm");
  });

  it("applies the variant styling for the chosen variant", () => {
    render(<Button variant="link">Read more</Button>);

    expect(screen.getByRole("button")).toHaveClass("underline-offset-4");
  });

  /** Callers pass layout classes that must win over the variant's own utilities. */
  it("merges a caller's class name into the variant classes", () => {
    render(<Button className="w-full">Save</Button>);

    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  /**
   * asChild lets a link carry button styling — used wherever a nav destination should look
   * like a button without nesting an anchor inside one.
   */
  it("renders as its child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/patients">Patients</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Patients" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("data-slot", "button");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("forwards arbitrary button props", () => {
    render(
      <Button type="submit" aria-label="Confirm">
        Ok
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toHaveAttribute("type", "submit");
  });
});

describe("buttonVariants", () => {
  it("falls back to the default variant and size", () => {
    expect(buttonVariants()).toBe(buttonVariants({ variant: "default", size: "default" }));
  });

  /** Two variants that resolved to the same classes would make one of them silently unusable. */
  it("gives every variant a distinct class list", () => {
    const variants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
    const rendered = variants.map((variant) => buttonVariants({ variant }));

    expect(new Set(rendered).size).toBe(variants.length);
  });

  it("gives every size a distinct class list", () => {
    const sizes = ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] as const;
    const rendered = sizes.map((size) => buttonVariants({ size }));

    expect(new Set(rendered).size).toBe(sizes.length);
  });

  it("appends an extra class name last so it can override the variant", () => {
    expect(buttonVariants({ className: "custom" }).endsWith("custom")).toBe(true);
  });
});
