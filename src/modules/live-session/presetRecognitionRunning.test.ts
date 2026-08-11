import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapping } from "@/modules/movement-mapping/testMappings";
import { preset } from "@/modules/patient-presets/testCatalogue";
import { createFrameSourceStub } from "@/modules/pose-capture/testPoses";
import { PressType } from "@/modules/movement-mapping";
import {
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

/** The trigger handler the runtime hands to recognition, as recognition would call it. */
const fireTrigger = () =>
  dependencies.createRuntime.mock.calls[0][0].handleTrigger({
    mappingId: "mapping-1",
    keybind: "Spacebar",
    keypressType: PressType.Click,
  }) as Promise<void>;

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

describe("running recognition", () => {
  it("presses the key and counts the trigger against the session", async () => {
    tracker.start();
    await startedRuntime();

    await fireTrigger();

    expect(dependencies.executeAction).toHaveBeenCalledWith("Spacebar", PressType.Click);
    expect(tracker.getSnapshot().triggerCountsByMapping).toEqual({ "mapping-1": 1 });
  });

  it("passes recognition's own updates on to the page", async () => {
    const recognition = await startedRuntime();
    const listener = vi.fn();
    recognition.subscribe(listener);
    recognitionRuntime.getSnapshot.mockReturnValue(emptyRecognitionStatus("Key not supported"));

    recognitionRuntime.subscribe.mock.calls[0][0]();

    expect(recognition.getSnapshot().recognitionStatus.error).toBe("Key not supported");
    expect(listener).toHaveBeenCalled();
  });

  it("stops recognition when the session leaves the page", async () => {
    const recognition = await startedRuntime();

    recognition.dispose();

    expect(recognitionRuntime.stop).toHaveBeenCalled();
  });

  it("stops telling a listener that has unsubscribed", async () => {
    const recognition = runtime();
    const listener = vi.fn();

    recognition.subscribe(listener)();
    await recognition.start("patient-1", "preset-1");

    expect(listener).not.toHaveBeenCalled();
  });
});
