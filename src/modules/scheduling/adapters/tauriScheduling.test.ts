import { beforeEach, describe, expect, it, vi } from "vitest";
import { invokeNative } from "@/contracts/native";
import { createScheduledSession, getDashboardOverview } from "./tauriScheduling";

vi.mock("@/contracts/native", () => ({ invokeNative: vi.fn() }));

const invoke = vi.mocked(invokeNative);

const scheduled = {
  id: "session-1",
  patientId: "patient-1",
  patientDisplayName: "Alex Smith",
  scheduledAtMs: 1_754_000_000_000,
};

const dayRange = { dayStartMs: 1_753_999_200_000, dayEndMs: 1_754_085_600_000 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDashboardOverview", () => {
  it("reads the day's overview for the range the dashboard is showing", async () => {
    invoke.mockResolvedValue({
      activePatientCount: 4,
      sessionsTodayCount: 2,
      todaysSchedule: [scheduled],
    } as never);

    await expect(getDashboardOverview(dayRange)).resolves.toEqual({
      activePatientCount: 4,
      sessionsTodayCount: 2,
      todaysSchedule: [scheduled],
    });

    expect(invoke).toHaveBeenCalledWith("get_dashboard_overview", dayRange);
  });

  it("reads an overview for a day with nothing booked", async () => {
    invoke.mockResolvedValue({
      activePatientCount: 0,
      sessionsTodayCount: 0,
      todaysSchedule: [],
    } as never);

    await expect(getDashboardOverview(dayRange)).resolves.toMatchObject({ todaysSchedule: [] });
  });

  it("passes a failure from the store straight through", async () => {
    invoke.mockRejectedValue(new Error("offline"));

    await expect(getDashboardOverview(dayRange)).rejects.toThrow("offline");
  });
});

describe("createScheduledSession", () => {
  it("books a session for a patient at a chosen time", async () => {
    invoke.mockResolvedValue(scheduled as never);

    await expect(createScheduledSession("patient-1", 1_754_000_000_000)).resolves.toEqual(
      scheduled,
    );

    expect(invoke).toHaveBeenCalledWith("create_scheduled_session", {
      patientId: "patient-1",
      scheduledAtMs: 1_754_000_000_000,
    });
  });
});
