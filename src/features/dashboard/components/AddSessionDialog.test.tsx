import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  combineLocalDateAndTime,
  createScheduledSession,
  getNextHalfHour,
  toTimeInputValue,
} from "@/modules/scheduling";
import { choosePatient, dateTrigger, dayCell, openDialog, submit } from "./addSessionHarness";

// Only the Tauri-backed write is replaced; the date helpers stay real so the prefilled
// next-half-hour slot behaves exactly as it does in the app.
vi.mock("@/modules/scheduling", async () => ({
  ...(await vi.importActual<typeof import("@/modules/scheduling/dateTime")>(
    "@/modules/scheduling/dateTime",
  )),
  createScheduledSession: vi.fn(),
}));

const create = vi.mocked(createScheduledSession);

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue(undefined as never);
});

describe("AddSessionDialog", () => {
  it("cannot be opened until a patient exists", async () => {
    await openDialog([]);

    expect(screen.getByRole("button", { name: "Add Session" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Session" })).toHaveAttribute(
      "title",
      "Add a patient before scheduling a session",
    );
  });

  it("opens the scheduling form from its trigger", async () => {
    await openDialog();

    expect(screen.getByRole("dialog", { name: "Add Session" })).toBeInTheDocument();
    expect(screen.getByText("Schedule an upcoming session for a patient.")).toBeInTheDocument();
  });

  /** Prefilling the next free slot means the common case is one click away. */
  it("prefills the next half hour", async () => {
    await openDialog();

    expect(screen.getByLabelText("Time")).toHaveValue(toTimeInputValue(getNextHalfHour()));
  });

  it("schedules the session for the chosen patient and slot", async () => {
    const { onSessionCreated } = await openDialog();
    const slot = getNextHalfHour();

    await choosePatient("Jo Lee");
    await userEvent.click(submit());

    expect(create).toHaveBeenCalledWith(
      "patient-2",
      combineLocalDateAndTime(slot, toTimeInputValue(slot)),
    );
    expect(onSessionCreated).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reopens with a blank patient selection", async () => {
    await openDialog();

    await choosePatient("Jo Lee");
    await userEvent.click(submit());
    await userEvent.click(screen.getByRole("button", { name: "Add Session" }));

    expect(screen.getByRole("combobox", { name: "Patient" })).toHaveTextContent("Select a patient");
  });

  /** Dismissing the dialog discards the draft, so the next open starts from the default slot. */
  it("clears a dismissed draft", async () => {
    await openDialog();

    await choosePatient("Jo Lee");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Add Session" }));

    expect(screen.getByRole("combobox", { name: "Patient" })).toHaveTextContent("Select a patient");
  });

  describe("date picking", () => {
    it("opens the calendar on the prefilled day", async () => {
      await openDialog();

      await userEvent.click(dateTrigger());

      expect(dayCell(getNextHalfHour())).toHaveAttribute("data-selected-single", "true");
    });

    /** Clicking the selected day clears it, leaving the dialog with no date to schedule. */
    it("prompts for a date again once the selection is cleared", async () => {
      await openDialog();

      await userEvent.click(dateTrigger());
      await userEvent.click(dayCell(getNextHalfHour()) as HTMLButtonElement);

      expect(screen.getByRole("button", { name: "Select a date" })).toBeInTheDocument();
    });
  });
});
