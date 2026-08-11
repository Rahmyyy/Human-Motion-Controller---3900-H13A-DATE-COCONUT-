import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "./input";
import { Label } from "./label";

describe("Label", () => {
  it("renders its text carrying the slot marker", () => {
    render(<Label>Patient name</Label>);

    const label = screen.getByText("Patient name");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("data-slot", "label");
  });

  /** The whole point of a label: naming the control and focusing it when clicked. */
  it("names and focuses the control it points at", async () => {
    render(
      <>
        <Label htmlFor="patient-name">Patient name</Label>
        <Input id="patient-name" />
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Patient name" });
    await userEvent.click(screen.getByText("Patient name"));

    expect(input).toHaveFocus();
  });

  it("merges a caller's class name with its own", () => {
    render(<Label className="text-destructive">Patient name</Label>);

    const label = screen.getByText("Patient name");
    expect(label).toHaveClass("text-destructive");
    expect(label).toHaveClass("text-sm");
  });
});
