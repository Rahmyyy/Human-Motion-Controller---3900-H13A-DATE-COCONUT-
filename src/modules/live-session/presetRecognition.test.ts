import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapping } from "@/modules/movement-mapping/testMappings";
import { preset } from "@/modules/patient-presets/testCatalogue";
import { createFrameSourceStub } from "@/modules/pose-capture/testPoses";
import {
  createPresetRecognitionRuntime,
  createPresetRecognitionRuntimeWithDependencies,
  emptyRecognitionStatus,
} from "./presetRecognition";
import { createSessionTracker } from "./sessionTracker";
import { createSessionClockStub } from "./testSessionClock";

const NEEDS_CALIBRATION = "Record a default resting state before starting recognition.";

let camera: ReturnType<typeof createFrameSourceStub>;
let tracker: ReturnType<typeof createSessionTracker>;
let recognitionRuntime: {
  getSnapshot: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};
let dependencies: {
  loadPreset: ReturnType<typeof vi.fn>;
  loadMappings: ReturnType<typeof vi.fn>;
  createRuntime: ReturnType<typeof vi.fn>;
  executeAction: ReturnType<typeof vi.fn>;
};

const runtime = () =>
  createPresetRecognitionRuntimeWithDependencies(
    camera.source,
    tracker,
    NEEDS_CALIBRATION,
    dependencies as unknown as Parameters<typeof createPresetRecognitionRuntimeWithDependencies>[3],
  );

async function startedRuntime() {
  const recognition = runtime();
  await recognition.start("patient-1", "preset-1");
  return recognition;
}

beforeEach(() => {
  camera = createFrameSourceStub();
  tracker = createSessionTracker(createSessionClockStub().clock);
  recognitionRuntime = {
    getSnapshot: vi.fn(() => emptyRecognitionStatus()),
    subscribe: vi.fn(() => vi.fn()),
    start: vi.fn(),
    stop: vi.fn(),
  };
  dependencies = {
    loadPreset: vi.fn().mockResolvedValue(preset({ defaultPoseFramesJson: "[]" })),
    loadMappings: vi.fn().mockResolvedValue([mapping()]),
    createRuntime: vi.fn(() => recognitionRuntime),
    executeAction: vi.fn().mockResolvedValue(undefined),
  };
});

describe("emptyRecognitionStatus", () => {
  it("describes a session with nothing recognised yet", () => {
    expect(emptyRecognitionStatus()).toEqual({
      bestMatch: null,
      mappingStatuses: [],
      triggeredMappingId: null,
      waitingForDefaultPose: false,
      error: null,
    });
  });

  it("can carry a message explaining why nothing is being recognised", () => {
    expect(emptyRecognitionStatus("Preset not found.").error).toBe("Preset not found.");
  });
});

describe("createPresetRecognitionRuntime", () => {
  it("starts idle before a preset is loaded", () => {
    expect(createPresetRecognitionRuntime(camera.source, tracker).getSnapshot()).toEqual({
      error: null,
      phase: "idle",
      presetName: null,
      recognitionStatus: emptyRecognitionStatus(),
    });
  });
});

describe("starting recognition for a preset", () => {
  it("runs the preset's movements against the camera", async () => {
    const recognition = await startedRuntime();

    expect(dependencies.createRuntime).toHaveBeenCalledWith(
      expect.objectContaining({ mappings: [mapping()], poseSource: camera.source }),
    );
    expect(recognitionRuntime.start).toHaveBeenCalled();
    expect(recognition.getSnapshot()).toMatchObject({ phase: "running", presetName: "Mario Kart" });
  });

  it("recognises against the preset's recorded resting pose", async () => {
    const frames = [{ timestampMs: 0, landmarks: [] }];
    dependencies.loadPreset.mockResolvedValue(
      preset({ defaultPoseFramesJson: JSON.stringify(frames) }),
    );

    await startedRuntime();

    expect(dependencies.createRuntime.mock.calls[0][0].defaultPoseFrames).toEqual(frames);
  });

  it("asks for a resting pose when the preset has none", async () => {
    dependencies.loadPreset.mockResolvedValue(preset({ defaultPoseFramesJson: null }));

    const recognition = await startedRuntime();

    expect(recognition.getSnapshot()).toMatchObject({
      phase: "error",
      error: NEEDS_CALIBRATION,
      presetName: "Mario Kart",
    });
    expect(dependencies.createRuntime).not.toHaveBeenCalled();
  });

  it("tells the clinician when the preset was not given", async () => {
    const recognition = runtime();

    await recognition.start("patient-1", undefined);

    expect(recognition.getSnapshot()).toMatchObject({
      phase: "error",
      error: "Preset not found.",
    });
  });

  it("tells the clinician when the preset could not be loaded", async () => {
    dependencies.loadMappings.mockRejectedValue(new Error("offline"));
    const recognition = runtime();

    await recognition.start("patient-1", "preset-1");

    expect(recognition.getSnapshot()).toMatchObject({ phase: "error", error: "offline" });
  });

  it("describes a failure that was not thrown as an error", async () => {
    dependencies.loadMappings.mockRejectedValue("no movements");
    const recognition = runtime();

    await recognition.start("patient-1", "preset-1");

    expect(recognition.getSnapshot().error).toBe("no movements");
  });

  it("ignores a load that a newer one has overtaken", async () => {
    dependencies.loadPreset.mockResolvedValueOnce(preset({ name: "Stale" }));
    const recognition = runtime();

    await Promise.all([
      recognition.start("patient-1", "preset-1"),
      recognition.start("patient-1", "preset-2"),
    ]);

    expect(recognition.getSnapshot().presetName).toBe("Mario Kart");
  });

  it("ignores a failed load that a newer one has overtaken", async () => {
    dependencies.loadPreset.mockRejectedValueOnce(new Error("offline"));
    const recognition = runtime();

    await Promise.all([
      recognition.start("patient-1", "preset-1"),
      recognition.start("patient-1", "preset-2"),
    ]);

    expect(recognition.getSnapshot().error).toBeNull();
  });
});
