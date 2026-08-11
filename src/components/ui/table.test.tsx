import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

/** Renders each part inside the parent element its tag is only valid within. */
function renderTable(children: React.ReactNode) {
  return render(<Table>{children}</Table>);
}

describe("Table", () => {
  it("wraps the table in a horizontally scrollable container", () => {
    const { container } = renderTable(
      <TableBody>
        <TableRow>
          <TableCell>Ada</TableCell>
        </TableRow>
      </TableBody>,
    );

    const wrapper = container.querySelector('[data-slot="table-container"]');
    expect(wrapper).toHaveClass("overflow-x-auto");
    expect(wrapper?.querySelector('[data-slot="table"]')).toBe(screen.getByRole("table"));
  });

  /** The class belongs on the table; putting it on the scroll container would not cascade the
   *  same way for the text and layout utilities callers pass. */
  it("merges a caller's class name onto the table itself, not the container", () => {
    const { container } = render(<Table className="text-xs" />);

    expect(screen.getByRole("table")).toHaveClass("text-xs");
    expect(container.querySelector('[data-slot="table-container"]')).not.toHaveClass("text-xs");
  });

  it("exposes header, body, and footer rows with their slot markers", () => {
    const { container } = renderTable(
      <>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ada</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>1 patient</TableCell>
          </TableRow>
        </TableFooter>
      </>,
    );

    expect(container.querySelector('[data-slot="table-header"]')?.tagName).toBe("THEAD");
    expect(container.querySelector('[data-slot="table-body"]')?.tagName).toBe("TBODY");
    expect(container.querySelector('[data-slot="table-footer"]')?.tagName).toBe("TFOOT");
    expect(screen.getByRole("columnheader", { name: "Patient" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Ada" })).toBeInTheDocument();
  });

  it("renders a caption describing the table", () => {
    const { container } = renderTable(
      <>
        <TableCaption>All patients</TableCaption>
        <TableBody />
      </>,
    );

    const caption = container.querySelector('[data-slot="table-caption"]');
    expect(caption?.tagName).toBe("CAPTION");
    expect(caption).toHaveTextContent("All patients");
  });

  /** Patient tables mark the open row as selected, which the row styling keys off. */
  it("carries a row's selected state through to the DOM", () => {
    renderTable(
      <TableBody>
        <TableRow data-state="selected">
          <TableCell>Ada</TableCell>
        </TableRow>
      </TableBody>,
    );

    expect(screen.getByRole("row")).toHaveAttribute("data-state", "selected");
  });

  it.each([
    ["table-head", TableHead],
    ["table-cell", TableCell],
  ] as const)("merges a caller's class name into %s", (slot, Cell) => {
    const { container } = renderTable(
      <TableBody>
        <TableRow>
          <Cell className="custom-class">cell</Cell>
        </TableRow>
      </TableBody>,
    );

    expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveClass("custom-class");
  });

  it.each([
    ["table-header", TableHeader],
    ["table-body", TableBody],
    ["table-footer", TableFooter],
    ["table-caption", TableCaption],
  ] as const)("merges a caller's class name into %s", (slot, Part) => {
    const { container } = render(
      <table>
        <Part className="custom-class" />
      </table>,
    );

    expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveClass("custom-class");
  });

  it("merges a caller's class name into table-row", () => {
    const { container } = renderTable(
      <TableBody>
        <TableRow className="custom-class" />
      </TableBody>,
    );

    expect(container.querySelector('[data-slot="table-row"]')).toHaveClass("custom-class");
  });

  it("builds a complete table of patient rows", () => {
    renderTable(
      <>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Sessions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ada</TableCell>
            <TableCell>12</TableCell>
          </TableRow>
        </TableBody>
      </>,
    );

    const body = screen.getAllByRole("rowgroup")[1];
    expect(
      within(body)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["Ada", "12"]);
  });
});
