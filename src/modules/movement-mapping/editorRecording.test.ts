import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFrameSourceStub, poseFrame } from "@/modules/pose-capture/testPoses";
import { preset } from "@/modules/patient-presets/testCatalogue";
import { createMappingEditor } from "./editor";
import { mappingDetails, presetLoaderStub, repositoryStub } from "./testMappings";
import { PressType } from "./types";

let camera: ReturnType<typeof createFrameSourceStub>;
let repository: ReturnType<typeof repositoryStub>;

const editor = () =>
  createMappingEditor(camera.source, repository, presetLoaderStub().mockResolvedValue(preset()));

async function newMovement() {
  const workspace = editor();
  await workspace.start({ patientId: "patient-1", presetId: "preset-1" });
  return workspace;
}

async function savedMovement() {
  const workspace = editor();
  await workspace.start({ mappingId: "mapping-1", patientId: "patient-1", presetId: "preset-1" });
  return workspace;
}

beforeEach(() => {
  camera = createFrameSourceStub();
  repository = repositoryStub();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("editing a movement's details", () => {
  it("takes the name the clinician typed", async () => {
    const workspace = await newMovement();

    workspace.setMovementName("right arm raise");

    expect(workspace.getSnapshot().movementName).toBe("right arm raise");
  });

  it("takes the key and press type the clinician chose", async () => {
    const workspace = await newMovement();

    workspace.setKeybind({ code: "Space", label: "Spacebar" });
    workspace.setKeypressType(PressType.Toggle);

    expect(workspace.getSnapshot().keybind).toEqual({ code: "Space", label: "Spacebar" });
    expect(workspace.getSnapshot().keypressType).toBe("Toggle");
  });

  it("keeps the trigger threshold inside the supported range", async () => {
    const workspace = await newMovement();

    workspace.setKeypressTriggerThreshold(10);
    expect(workspace.getSnapshot().keypressTriggerThresholdPercentage).toBe(30);

    workspace.setKeypressTriggerThreshold(140);
    expect(workspace.getSnapshot().keypressTriggerThresholdPercentage).toBe(100);

    workspace.setKeypressTriggerThreshold(74.6);
    expect(workspace.getSnapshot().keypressTriggerThresholdPercentage).toBe(75);
  });

  it("tells its listeners about every change", async () => {
    const workspace = await newMovement();
    const listener = vi.fn();
    workspace.subscribe(listener);

    workspace.setMovementName("nod");

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("choosing which joints to watch", () => {
  it("rejudges the recording against the new selection", async () => {
    const workspace = await savedMovement();

    workspace.setSelectedLandmarks([25, 26]);

    expect(workspace.getSnapshot().selectedLandmarks).toEqual([25, 26]);
    expect(workspace.getSnapshot().recordingQuality?.issues).toContain("selection_misses_movement");
    expect(workspace.getSnapshot().canSave).toBe(false);
  });

  it("keeps its own copy of the selection", async () => {
    const workspace = await savedMovement();
    const selection = [15, 16];

    workspace.setSelectedLandmarks(selection);
    selection.push(11);

    expect(workspace.getSnapshot().selectedLandmarks).toEqual([15, 16]);
  });
});

describe("recording a movement", () => {
  it("counts the patient in before recording", async () => {
    const workspace = await newMovement();

    workspace.startRecording();

    expect(workspace.getSnapshot()).toMatchObject({
      recordingState: "countdown",
      countdownSeconds: 3,
    });
  });

  it("returns to idle when the countdown is cancelled", async () => {
    const workspace = await newMovement();
    workspace.startRecording();

    workspace.cancelCountdown();

    expect(workspace.getSnapshot().recordingState).toBe("idle");
  });

  it("judges the take once the recording is stopped", async () => {
    vi.useFakeTimers();
    const now = vi.spyOn(performance, "now");
    const workspace = await newMovement();
    now.mockReturnValue(0);
    workspace.startRecording();
    now.mockReturnValue(3000);
    vi.advanceTimersByTime(50);

    camera.emit(poseFrame(0), poseFrame(40));
    workspace.stopRecording();

    expect(workspace.getSnapshot().recordingState).toBe("recorded");
    expect(workspace.getSnapshot().recordingQuality?.status).toBe("unusable");
    expect(workspace.getSnapshot().canSave).toBe(false);
  });

  it("throws the take away when the recording is reset", async () => {
    const workspace = await savedMovement();

    workspace.resetRecording();

    expect(workspace.getSnapshot()).toMatchObject({
      recordingState: "idle",
      recordedFrames: [],
      recordingQuality: null,
      canSave: false,
    });
  });

  it("narrows the take to the trimmed range", async () => {
    const workspace = await savedMovement();
    const fullLength = workspace.getSnapshot().recordedFrames.length;

    workspace.trimRecording({ durationMs: 1160, startMs: 0, endMs: 400 });

    expect(workspace.getSnapshot().recordedFrames.length).toBeLessThan(fullLength);
  });

  /** The page can call these before the editor has finished opening. */
  it("has no recording to command before the editor has opened", () => {
    const workspace = editor();

    expect(() => {
      workspace.startRecording();
      workspace.cancelCountdown();
      workspace.stopRecording();
      workspace.resetRecording();
      workspace.trimRecording({ durationMs: 0, startMs: 0, endMs: 0 });
    }).not.toThrow();
  });

  it("cannot save a movement whose recording was never usable", async () => {
    repository.get.mockResolvedValue(mappingDetails({ poseFramesJson: "[]" }));

    const workspace = await savedMovement();

    expect(workspace.getSnapshot().canSave).toBe(false);
  });
});
