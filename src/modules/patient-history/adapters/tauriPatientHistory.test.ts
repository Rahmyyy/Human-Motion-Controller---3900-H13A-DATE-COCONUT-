import { beforeEach, describe, expect, it, vi } from "vitest";
import { invokeNative } from "@/contracts/native";
import { getPatientSessions } from "./tauriPatientHistory";

vi.mock("@/contracts/native", () => ({ invokeNative: vi.fn() }));

const invoke = vi.mocked(invokeNative);

const mappingStat = {
  mappingId: "mapping-1",
  mappingName: "right arm raise",
  keybind: "Spacebar",
  thresholdPercentage: 90,
  keypressTriggerThresholdPercentage: 60,
  triggerCount: 18,
};

const patientSession = {
  id: "session-1",
  presetId: "preset-1",
  presetName: "Mario Kart",
  startedAtMs: 1_754_000_000_000,
  durationMs: 756_000,
  triggerCount: 31,
  mappings: [mappingStat],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPatientSessions", () => {
  it("reads a patient's completed sessions with their per-movement stats", async () => {
    invoke.mockResolvedValue([patientSession] as never);

    await expect(getPatientSessions("patient-1")).resolves.toEqual([patientSession]);

    expect(invoke).toHaveBeenCalledWith("get_patient_sessions", { patientId: "patient-1" });
  });

  it("reads a session that recorded no movement stats", async () => {
    invoke.mockResolvedValue([{ ...patientSession, mappings: [] }] as never);

    await expect(getPatientSessions("patient-1")).resolves.toMatchObject([{ mappings: [] }]);
  });

  it("reads nothing back for a patient with no sessions yet", async () => {
    invoke.mockResolvedValue([] as never);

    await expect(getPatientSessions("patient-1")).resolves.toEqual([]);
  });

  it("passes a failure from the store straight through", async () => {
    invoke.mockRejectedValue(new Error("offline"));

    await expect(getPatientSessions("patient-1")).rejects.toThrow("offline");
  });
});
