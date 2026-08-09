import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createScheduledSession } from "@/modules/scheduling";
import { choosePatient, openDialog, submit } from "./addSessionHarness";

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AddSessionDialog validation", () => {
  it("asks for the missing patient before saving", async () => {
    await openDialog();

    await userEvent.click(submit());

    expect(screen.getByRole("alert")).toHaveTextContent("Select a patient, date, and time.");
    expect(create).not.toHaveBeenCalled();
  });

  it("asks for the missing time before saving", async () => {
    await openDialog();

    await choosePatient("Alex Smith");
    await userEvent.clear(screen.getByLabelText("Time"));
    await userEvent.click(submit());

    expect(screen.getByRole("alert")).toHaveTextContent("Select a patient, date, and time.");
  });

  /** A slot that has already passed cannot be scheduled, however it was reached. */
  it("refuses a slot in the past", async () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date(3000, 0, 1).getTime());
    await openDialog();

    await choosePatient("Alex Smith");
    await userEvent.click(submit());

    expect(screen.getByRole("alert")).toHaveTextContent("Scheduled session must be in the future.");
    expect(create).not.toHaveBeenCalled();
  });
});

describe("AddSessionDialog save failures", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows the reason the write gave", async () => {
    create.mockRejectedValue(new Error("database locked"));
    const { onSessionCreated } = await openDialog();

    await choosePatient("Alex Smith");
    await userEvent.click(submit());

    expect(screen.getByRole("alert")).toHaveTextContent("database locked");
    expect(onSessionCreated).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  /** Tauri can reject with a bare string, which still needs a readable message. */
  it("falls back to a generic message for a non-error rejection", async () => {
    create.mockRejectedValue("something odd");
    await openDialog();

    await choosePatient("Alex Smith");
    await userEvent.click(submit());

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to create session.");
  });
});
