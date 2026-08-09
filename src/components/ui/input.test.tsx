import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  it("renders a text box carrying its slot marker", () => {
    render(<Input aria-label="Patient name" />);

    const input = screen.getByRole("textbox", { name: "Patient name" });
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("data-slot", "input");
  });

  it("accepts typed text", async () => {
    render(<Input aria-label="Patient name" />);

    await userEvent.type(screen.getByRole("textbox"), "Ada");

    expect(screen.getByRole("textbox")).toHaveValue("Ada");
  });

  it("reports each change to its handler", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Patient name" onChange={onChange} />);

    await userEvent.type(screen.getByRole("textbox"), "abc");

    expect(onChange).toHaveBeenCalledTimes(3);
  });

  /** The type prop is forwarded rather than swallowed, so number and date fields still work. */
  it("forwards the input type", () => {
    render(<Input type="number" aria-label="Reps" />);

    expect(screen.getByRole("spinbutton")).toHaveAttribute("type", "number");
  });

  it("leaves the type unset when none is given", () => {
    render(<Input aria-label="Patient name" />);

    expect(screen.getByRole("textbox")).not.toHaveAttribute("type");
  });

  it("takes no typing while disabled", async () => {
    render(<Input aria-label="Patient name" disabled />);

    await userEvent.type(screen.getByRole("textbox"), "Ada");

    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("merges a caller's class name with its own", () => {
    render(<Input aria-label="Patient name" className="col-span-2" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("col-span-2");
    expect(input).toHaveClass("w-full");
  });

  /** Form screens mark failed fields with aria-invalid to trigger the destructive styling. */
  it("forwards validation and placeholder attributes", () => {
    render(<Input aria-label="Patient name" aria-invalid placeholder="Full name" required />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("placeholder", "Full name");
    expect(input).toBeRequired();
  });
});
