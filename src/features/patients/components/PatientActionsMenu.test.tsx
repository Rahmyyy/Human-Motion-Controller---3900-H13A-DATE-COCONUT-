import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { patient } from "../testPatients";
import PatientActionsMenu from "./PatientActionsMenu";

/** The menu lives inside a clickable table row, so the row's handler is watched here too. */
function renderMenu() {
  const onModify = vi.fn();
  const onRowActivate = vi.fn();
  render(
    <div role="row" tabIndex={0} onClick={onRowActivate} onKeyDown={onRowActivate}>
      <PatientActionsMenu onModify={onModify} patient={patient()} />
    </div>,
  );
  return { onModify, onRowActivate };
}

const trigger = () => screen.getByRole("button", { name: "Actions for Alex Smith" });

describe("PatientActionsMenu", () => {
  it("names the patient it acts on", () => {
    renderMenu();

    expect(trigger()).toBeInTheDocument();
  });

  it("offers the modify action once opened", async () => {
    renderMenu();

    await userEvent.click(trigger());

    expect(screen.getByRole("menuitem", { name: "Modify" })).toBeInTheDocument();
  });

  it("reports the patient to modify", async () => {
    const { onModify } = renderMenu();

    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: "Modify" }));

    expect(onModify).toHaveBeenCalledWith(patient());
  });

  // The row underneath opens the patient. Opening the menu, or clicking inside it, must not.
  describe("row isolation", () => {
    it("does not open the patient when the menu is opened", async () => {
      const { onRowActivate } = renderMenu();

      await userEvent.click(trigger());

      expect(onRowActivate).not.toHaveBeenCalled();
    });

    it("does not open the patient when the trigger is used from the keyboard", async () => {
      const { onRowActivate } = renderMenu();

      trigger().focus();
      await userEvent.keyboard("{Enter}");

      expect(onRowActivate).not.toHaveBeenCalled();
    });

    it("does not open the patient when the menu itself is clicked", async () => {
      const { onRowActivate } = renderMenu();

      await userEvent.click(trigger());
      await userEvent.click(screen.getByRole("menuitem", { name: "Modify" }));

      expect(onRowActivate).not.toHaveBeenCalled();
    });
  });

  /** The ellipsis carries no meaning the trigger's label does not already give. */
  it("hides its icon from assistive technology", () => {
    const { container } = render(<PatientActionsMenu onModify={vi.fn()} patient={patient()} />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
