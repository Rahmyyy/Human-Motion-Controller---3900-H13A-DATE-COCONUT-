import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

/** The card's Tailwind rules select on data-slot, so every part must publish its own. */
const parts = [
  ["card", Card],
  ["card-header", CardHeader],
  ["card-title", CardTitle],
  ["card-description", CardDescription],
  ["card-action", CardAction],
  ["card-content", CardContent],
  ["card-footer", CardFooter],
] as const;

describe("Card parts", () => {
  it.each(parts)("marks %s with its slot name", (slot, Part) => {
    const { container } = render(<Part>content</Part>);

    expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveTextContent("content");
  });

  it.each(parts)("merges a caller's class name into %s", (slot, Part) => {
    const { container } = render(<Part className="custom-class">content</Part>);

    expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveClass("custom-class");
  });

  it.each(parts)("forwards arbitrary props to %s", (slot, Part) => {
    const { container } = render(<Part id={`${slot}-id`}>content</Part>);

    expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveAttribute("id", `${slot}-id`);
  });
});

describe("Card", () => {
  /** The size drives the card's spacing variable, which the nested parts inherit. */
  it("sizes itself as default when no size is chosen", () => {
    const { container } = render(<Card>content</Card>);

    expect(container.querySelector('[data-slot="card"]')).toHaveAttribute("data-size", "default");
  });

  it("records a small size", () => {
    const { container } = render(<Card size="sm">content</Card>);

    expect(container.querySelector('[data-slot="card"]')).toHaveAttribute("data-size", "sm");
  });

  it("composes into a full card without losing any part", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Session summary</CardTitle>
          <CardDescription>Last week</CardDescription>
          <CardAction>Edit</CardAction>
        </CardHeader>
        <CardContent>12 sessions</CardContent>
        <CardFooter>Updated today</CardFooter>
      </Card>,
    );

    for (const text of ["Session summary", "Last week", "Edit", "12 sessions", "Updated today"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });
});
