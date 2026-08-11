import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  createFrameSourceStub,
  poseFrame,
  stillPoseFrames,
} from "@/modules/pose-capture/testPoses";
import { createRecognitionRuntime } from "./runtime";
import { createClockStub, flushPromises } from "./testClock";
import { REACHING, reachMapping } from "./testReachPreset";
import type { TriggerHandler } from "./types";

let camera: ReturnType<typeof createFrameSourceStub>;
let clock: ReturnType<typeof createClockStub>;
let handleTrigger: Mock<TriggerHandler>;

function startRuntime() {
  const runtime = createRecognitionRuntime({
    mappings: [reachMapping],
    defaultPoseFrames: stillPoseFrames(30),
    poseSource: camera.source,
    clock: clock.clock,
    handleTrigger,
  });
  runtime.start();
  return runtime;
}

/** Feeds the pose that fires the key, holding it long enough for the gate to accept it. */
const reachUntilTriggered = (startMs = 0) => {
  for (let index = 0; index < 5; index += 1) camera.emit(poseFrame(startMs + index * 40, REACHING));
};

beforeEach(() => {
  camera = createFrameSourceStub();
  clock = createClockStub();
  handleTrigger = vi.fn<TriggerHandler>().mockResolvedValue(undefined);
});

describe("firing a recognised movement", () => {
  it("presses the key the moment a movement is recognised", async () => {
    const runtime = startRuntime();
    const listener = vi.fn();
    runtime.subscribe(listener);

    reachUntilTriggered();
    await flushPromises();

    expect(handleTrigger).toHaveBeenCalledWith({
      mappingId: "reach",
      keybind: "Enter",
      keypressType: "Click",
    });
    expect(listener).toHaveBeenCalled();
    expect(runtime.getSnapshot().triggeredMappingId).toBe("reach");
  });

  it("keeps the movement highlighted just long enough to be noticed", () => {
    const runtime = startRuntime();
    reachUntilTriggered();

    clock.advance(499);
    expect(runtime.getSnapshot().triggeredMappingId).toBe("reach");

    clock.advance(1);
    expect(runtime.getSnapshot().triggeredMappingId).toBeNull();
  });

  it("tells the clinician when the key press failed", async () => {
    handleTrigger.mockRejectedValue(new Error("Key not supported"));
    const runtime = startRuntime();

    reachUntilTriggered();
    await flushPromises();

    expect(runtime.getSnapshot().error).toBe("Key not supported");
  });

  it("describes a failure that was not thrown as an error", async () => {
    handleTrigger.mockRejectedValue("no keyboard");
    const runtime = startRuntime();

    reachUntilTriggered();
    await flushPromises();

    expect(runtime.getSnapshot().error).toBe("no keyboard");
  });

  it("clears the warning once a key press succeeds again", async () => {
    handleTrigger.mockRejectedValueOnce(new Error("Key not supported"));
    const runtime = startRuntime();
    reachUntilTriggered();
    await flushPromises();

    camera.emit(poseFrame(200), poseFrame(240), poseFrame(280));
    reachUntilTriggered(400);
    await flushPromises();

    expect(runtime.getSnapshot().error).toBeNull();
  });

  it("drops the pending update and the highlight when the session ends", () => {
    const runtime = startRuntime();
    const listener = vi.fn();
    runtime.subscribe(listener);
    reachUntilTriggered();

    runtime.stop();

    expect(clock.pendingTimers).toBe(0);
    expect(runtime.getSnapshot().triggeredMappingId).toBeNull();
  });

  it("refreshes straight away when the patient becomes ready again", () => {
    const runtime = startRuntime();
    reachUntilTriggered();
    const listener = vi.fn();
    runtime.subscribe(listener);

    camera.emit(poseFrame(200), poseFrame(240), poseFrame(280));

    expect(listener).toHaveBeenCalled();
    expect(runtime.getSnapshot().waitingForDefaultPose).toBe(false);
  });
});
