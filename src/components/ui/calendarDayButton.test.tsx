import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Modifiers } from "react-day-picker";
import { describe, expect, it } from "vitest";
import { Calendar, CalendarDayButton } from "./calendar";

const MARCH_2026 = new Date(2026, 2, 15);

/** react-day-picker hands the button a CalendarDay; only its date matters to this component. */
const calendarDay = { date: MARCH_2026 } as React.ComponentProps<typeof CalendarDayButton>["day"];

function renderDayButton(modifiers: Partial<Modifiers> = {}) {
  return render(
    <CalendarDayButton day={calendarDay} modifiers={modifiers as Modifiers} day-index={0}>
      15
    </CalendarDayButton>,
  );
}

describe("CalendarDayButton", () => {
  it("tags itself with the date it represents", () => {
    renderDayButton();

    expect(screen.getByRole("button")).toHaveAttribute(
      "data-day",
      MARCH_2026.toLocaleDateString(undefined),
    );
  });

  it("formats its date tag with a caller-supplied locale", () => {
    render(
      <CalendarDayButton day={calendarDay} modifiers={{} as Modifiers} locale={{ code: "en-GB" }}>
        15
      </CalendarDayButton>,
    );

    expect(screen.getByRole("button")).toHaveAttribute(
      "data-day",
      MARCH_2026.toLocaleDateString("en-GB"),
    );
  });

  describe("selection state", () => {
    /** A lone selected day is styled as a filled pill; a range end is styled as a range cap. */
    it("marks a lone selected day as a single selection", () => {
      renderDayButton({ selected: true });

      expect(screen.getByRole("button")).toHaveAttribute("data-selected-single", "true");
    });

    it("does not mark a range boundary as a single selection", () => {
      renderDayButton({ selected: true, range_start: true });

      expect(screen.getByRole("button")).toHaveAttribute("data-selected-single", "false");
      expect(screen.getByRole("button")).toHaveAttribute("data-range-start", "true");
    });

    it.each(["range_start", "range_middle", "range_end"] as const)(
      "publishes its %s position in a range",
      (modifier) => {
        renderDayButton({ selected: true, [modifier]: true });

        const attribute = `data-${modifier.replace("_", "-")}`;
        expect(screen.getByRole("button")).toHaveAttribute(attribute, "true");
      },
    );

    it("marks an unselected day as neither selected nor in a range", () => {
      renderDayButton();

      const button = screen.getByRole("button");
      expect(button).not.toHaveAttribute("data-selected-single");
      expect(button).not.toHaveAttribute("data-range-start");
    });
  });

  it("merges a caller's class name with its own", () => {
    render(
      <CalendarDayButton day={calendarDay} modifiers={{} as Modifiers} className="custom-class">
        15
      </CalendarDayButton>,
    );

    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });

  /**
   * Arrow-key navigation moves react-day-picker's focused day without moving DOM focus, so the
   * button has to pull focus to itself when it becomes the focused one.
   */
  it("takes DOM focus when it becomes the focused day", async () => {
    render(<Calendar mode="single" defaultMonth={MARCH_2026} />);

    await userEvent.click(screen.getByRole("button", { name: "Sunday, March 15th, 2026" }));
    await userEvent.keyboard("{ArrowRight}");

    expect(screen.getByRole("button", { name: /March 16th/ })).toHaveFocus();
  });
});
