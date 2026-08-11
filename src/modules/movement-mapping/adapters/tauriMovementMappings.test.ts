import { beforeEach, describe, expect, it, vi } from "vitest";
import { invokeNative } from "@/contracts/native";
import { mapping, mappingDetails } from "../testMappings";
import { PressType } from "../types";
import {
  getMovementMapping,
  getMovementMappings,
  tauriMovementMappings,
} from "./tauriMovementMappings";

vi.mock("@/contracts/native", () => ({ invokeNative: vi.fn() }));

const invoke = vi.mocked(invokeNative);

const createInput = {
  presetId: "preset-1",
  name: "right arm raise",
  keybind: "Spacebar",
  keypressType: PressType.Click,
  poseFramesJson: "[]",
  selectedLandmarks: [15, 16],
  keypressTriggerThresholdPercentage: 60,
};

beforeEach(() => {
  vi.clearAllMocks();
  invoke.mockResolvedValue(undefined as never);
});

describe("tauriMovementMappings", () => {
  it("creates a movement from the editor's input", async () => {
    await tauriMovementMappings.create(createInput);

    expect(invoke).toHaveBeenCalledWith("create_movement_mapping", createInput);
  });

  it("lists the movements a preset defines", async () => {
    invoke.mockResolvedValue([mapping()] as never);

    await expect(tauriMovementMappings.list("preset-1")).resolves.toEqual([mapping()]);

    expect(invoke).toHaveBeenCalledWith("get_movement_mappings", { presetId: "preset-1" });
  });

  it("lists nothing for a preset with no movements", async () => {
    invoke.mockResolvedValue([] as never);

    await expect(tauriMovementMappings.list("preset-1")).resolves.toEqual([]);
  });

  it("reads one movement in full", async () => {
    invoke.mockResolvedValue(mappingDetails() as never);

    await expect(tauriMovementMappings.get("mapping-1", "preset-1")).resolves.toEqual(
      mappingDetails(),
    );

    expect(invoke).toHaveBeenCalledWith("get_movement_mapping", {
      id: "mapping-1",
      presetId: "preset-1",
    });
  });

  it("updates a movement against its own id", async () => {
    await tauriMovementMappings.update({ ...createInput, id: "mapping-1" });

    expect(invoke).toHaveBeenCalledWith("update_movement_mapping", {
      ...createInput,
      id: "mapping-1",
    });
  });

  it("deletes a movement from its preset", async () => {
    await tauriMovementMappings.delete("mapping-1", "preset-1");

    expect(invoke).toHaveBeenCalledWith("delete_movement_mapping", {
      id: "mapping-1",
      presetId: "preset-1",
    });
  });

  it("updates a movement's threshold on its own", async () => {
    await tauriMovementMappings.updateThreshold("mapping-1", "preset-1", 90);

    expect(invoke).toHaveBeenCalledWith("update_movement_mapping_threshold", {
      id: "mapping-1",
      presetId: "preset-1",
      thresholdPercentage: 90,
    });
  });

  it("passes a failure from the store straight through", async () => {
    invoke.mockRejectedValue(new Error("offline"));

    await expect(tauriMovementMappings.list("preset-1")).rejects.toThrow("offline");
  });
});

describe("movement mapping shorthands", () => {
  it("lists a preset's movements", async () => {
    invoke.mockResolvedValue([mapping()] as never);

    await expect(getMovementMappings("preset-1")).resolves.toEqual([mapping()]);
  });

  it("reads one movement", async () => {
    invoke.mockResolvedValue(mappingDetails() as never);

    await expect(getMovementMapping("mapping-1", "preset-1")).resolves.toEqual(mappingDetails());
  });
});
