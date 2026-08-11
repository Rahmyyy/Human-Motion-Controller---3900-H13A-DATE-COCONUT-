import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders a multi-line text box carrying its slot marker", () => {
    render(<Textarea aria-label="Session notes" />);

    const textarea = screen.getByRole("textbox", { name: "Session notes" });
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAttribute("data-slot", "textarea");
  });

  it("accepts typed text across lines", async () => {
    render(<Textarea aria-label="Session notes" />);

    await userEvent.type(screen.getByRole("textbox"), "first{Enter}second");

    expect(screen.getByRole("textbox")).toHaveValue("first\nsecond");
  });

  it("takes no typing while disabled", async () => {
    render(<Textarea aria-label="Session notes" disabled />);

    await userEvent.type(screen.getByRole("textbox"), "notes");

    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("merges a caller's class name with its own", () => {
    render(<Textarea aria-label="Session notes" className="min-h-40" />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass("min-h-40");
    expect(textarea).toHaveClass("w-full");
  });

  it("forwards placeholder, row, and validation attributes", () => {
    render(
      <Textarea aria-label="Session notes" placeholder="How did it go?" rows={6} aria-invalid />,
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("placeholder", "How did it go?");
    expect(textarea).toHaveAttribute("rows", "6");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
  });
});
