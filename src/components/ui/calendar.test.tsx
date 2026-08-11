import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "./calendar";

const MARCH_2026 = new Date(2026, 2, 15);

type CalendarProps = React.ComponentProps<typeof Calendar>;

/** Calendar's props are a union discriminated by `mode`, which a partial spread would collapse. */
function renderCalendar(props: Partial<CalendarProps> = {}) {
  return render(<Calendar month={MARCH_2026} {...(props as CalendarProps)} />);
}

/** Days are only buttons when a selection mode is set, so they are found by their label. */
const day = (label: string) => screen.getByLabelText(label);

describe("Calendar", () => {
  it("renders the requested month as a grid of days", () => {
    renderCalendar();

    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByText("March 2026")).toBeInTheDocument();
    expect(day("Sunday, March 15th, 2026")).toBeInTheDocument();
  });

  it("marks its root with the calendar slot", () => {
    const { container } = renderCalendar();

    expect(container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
  });

  /** Trailing days keep the grid rectangular, which stops the popover resizing month to month. */
  it("fills the grid with neighbouring months' days by default", () => {
    renderCalendar();

    expect(screen.getByText("28")).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(31);
  });

  it("can leave the neighbouring days out", () => {
    renderCalendar({ showOutsideDays: false });

    expect(screen.queryByLabelText(/April 1st/)).not.toBeInTheDocument();
  });

  it("reports the day a user picks", async () => {
    const onSelect = vi.fn();
    renderCalendar({ mode: "single", onSelect });

    await userEvent.click(day("Friday, March 20th, 2026"));

    expect(onSelect.mock.calls[0][0]).toEqual(new Date(2026, 2, 20));
  });

  it("does not report a disabled day", async () => {
    const onSelect = vi.fn();
    renderCalendar({ mode: "single", onSelect, disabled: { before: MARCH_2026 } });

    await userEvent.click(day("Tuesday, March 10th, 2026"));

    expect(onSelect).not.toHaveBeenCalled();
  });

  describe("navigation", () => {
    it("renders previous and next chevrons", () => {
      renderCalendar();

      expect(screen.getByRole("button", { name: /previous month/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next month/i })).toBeInTheDocument();
    });

    it("moves to the next month when the next chevron is used", async () => {
      renderCalendar({ defaultMonth: MARCH_2026, month: undefined });

      await userEvent.click(screen.getByRole("button", { name: /next month/i }));

      expect(screen.getByText("April 2026")).toBeInTheDocument();
    });

    /** Nav buttons borrow the app's button styling so the calendar matches its surroundings. */
    it("styles the nav buttons with the chosen button variant", () => {
      renderCalendar({ buttonVariant: "outline" });

      expect(screen.getByRole("button", { name: /previous month/i })).toHaveClass("border-border");
    });
  });

  describe("caption layouts", () => {
    it("shows a plain month label by default", () => {
      renderCalendar();

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    /** The dropdown layout adds a third, downward chevron next to the month name. */
    it("offers month and year dropdowns when asked", () => {
      renderCalendar({ captionLayout: "dropdown" });

      expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
    });

    it("abbreviates the month names in the dropdown", () => {
      renderCalendar({ captionLayout: "dropdown" });

      expect(screen.getByRole("option", { name: "Mar" })).toBeInTheDocument();
    });

    /** A caller-supplied formatter must win over the abbreviation this component installs. */
    it("lets a caller override the month formatter", () => {
      renderCalendar({
        captionLayout: "dropdown",
        formatters: { formatMonthDropdown: () => "Custom" },
      });

      expect(screen.getAllByRole("option", { name: "Custom" }).length).toBe(12);
    });
  });

  describe("week numbers", () => {
    it("omits the week-number column by default", () => {
      const { container } = renderCalendar();

      expect(container.querySelector("th.rdp-week_number_header")).toBeNull();
    });

    it("renders week numbers in their own cells when asked", () => {
      renderCalendar({ showWeekNumber: true });

      expect(screen.getAllByRole("rowheader").length).toBeGreaterThanOrEqual(5);
    });
  });

  it("merges a caller's class name onto the root", () => {
    const { container } = renderCalendar({ className: "custom-class" });

    expect(container.querySelector('[data-slot="calendar"]')).toHaveClass("custom-class");
  });

  /** classNames and components are merge points, so a caller can replace a single part. */
  it("lets a caller override an individual part's classes", () => {
    const { container } = renderCalendar({ classNames: { month_grid: "grid-class" } });

    expect(container.querySelector("table")).toHaveClass("grid-class");
  });

  it("lets a caller replace an individual component", () => {
    renderCalendar({
      components: { WeekNumber: () => <td>replaced</td> },
      showWeekNumber: true,
    });

    expect(screen.getAllByText("replaced").length).toBeGreaterThan(0);
  });
});
