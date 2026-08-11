import { beforeEach, describe, expect, it, vi } from "vitest";
import { invokeNative } from "@/contracts/native";
import { preset } from "../testCatalogue";
import {
  createPreset,
  deletePreset,
  duplicatePreset,
  getPreset,
  getPresets,
  updateDefaultPose,
} from "./tauriCatalogue";

vi.mock("@/contracts/native", () => ({ invokeNative: vi.fn() }));

const invoke = vi.mocked(invokeNative);

beforeEach(() => {
  vi.clearAllMocks();
  invoke.mockResolvedValue(undefined as never);
});

describe("presets", () => {
  it("lists a patient's presets", async () => {
    invoke.mockResolvedValue([preset()] as never);

    await expect(getPresets("patient-1")).resolves.toEqual([preset()]);

    expect(invoke).toHaveBeenCalledWith("get_presets", { patientId: "patient-1" });
  });

  it("reads one preset belonging to a patient", async () => {
    invoke.mockResolvedValue(preset() as never);

    await expect(getPreset("preset-1", "patient-1")).resolves.toEqual(preset());

    expect(invoke).toHaveBeenCalledWith("get_preset", { id: "preset-1", patientId: "patient-1" });
  });

  it("creates a preset for a patient", async () => {
    invoke.mockResolvedValue(preset() as never);

    await createPreset("patient-1", "Mario Kart");

    expect(invoke).toHaveBeenCalledWith("create_preset", {
      patientId: "patient-1",
      name: "Mario Kart",
    });
  });

  it("saves a preset's resting pose", async () => {
    invoke.mockResolvedValue(preset() as never);

    await updateDefaultPose("preset-1", "patient-1", "[]");

    expect(invoke).toHaveBeenCalledWith("update_default_pose", {
      id: "preset-1",
      patientId: "patient-1",
      defaultPoseFramesJson: "[]",
    });
  });

  it("duplicates a preset", async () => {
    invoke.mockResolvedValue(preset({ id: "preset-2" }) as never);

    await expect(duplicatePreset("preset-1")).resolves.toMatchObject({ id: "preset-2" });

    expect(invoke).toHaveBeenCalledWith("duplicate_preset", { id: "preset-1" });
  });

  it("deletes a preset", async () => {
    await deletePreset("preset-1");

    expect(invoke).toHaveBeenCalledWith("delete_preset", { id: "preset-1" });
  });

  it("passes a failure from the store straight through", async () => {
    invoke.mockRejectedValue(new Error("offline"));

    await expect(getPresets("patient-1")).rejects.toThrow("offline");
  });
});
