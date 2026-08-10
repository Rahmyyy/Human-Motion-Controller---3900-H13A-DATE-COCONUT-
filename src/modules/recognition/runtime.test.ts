import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  createFrameSourceStub,
  hideAllBut,
  poseFrame,
  stillPoseFrames,
} from "@/modules/pose-capture/testPoses";
import { createRecognitionRuntime } from "./runtime";
import { createClockStub } from "./testClock";
import { reachMapping } from "./testReachPreset";
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

beforeEach(() => {
  camera = createFrameSourceStub();
  clock = createClockStub();
  handleTrigger = vi.fn<TriggerHandler>().mockResolvedValue(undefined);
});

describe("createRecognitionRuntime", () => {
  it("starts from the engine's own idea of the preset", () => {
    const runtime = startRuntime();

    expect(runtime.getSnapshot().mappingStatuses.map((status) => status.id)).toEqual(["reach"]);
  });

  it("watches the camera once, however often it is started", () => {
    const runtime = startRuntime();

    runtime.start();

    expect(camera.subscriberCount).toBe(1);
  });

  it("stops watching the camera when the session ends", () => {
    startRuntime().stop();

    expect(camera.subscriberCount).toBe(0);
  });

  it("holds back rapid updates so the panel refreshes about ten times a second", () => {
    const runtime = startRuntime();
    const listener = vi.fn();
    runtime.subscribe(listener);

    camera.emit(poseFrame(0), poseFrame(40));
    expect(listener).not.toHaveBeenCalled();

    clock.advance(100);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("refreshes straight away once the quiet period has passed", () => {
    const runtime = startRuntime();
    const listener = vi.fn();
    runtime.subscribe(listener);
    camera.emit(poseFrame(0));
    clock.advance(100);

    clock.advance(200);
    camera.emit(poseFrame(40));

    expect(listener).toHaveBeenCalledTimes(2);
    expect(clock.pendingTimers).toBe(0);
  });

  it("stops telling a listener that has unsubscribed", () => {
    const runtime = startRuntime();
    const listener = vi.fn();

    runtime.subscribe(listener)();
    camera.emit(poseFrame(0));
    clock.advance(100);

    expect(listener).not.toHaveBeenCalled();
  });

  it("drops an update still waiting out the quiet period when the session ends", () => {
    const runtime = startRuntime();
    const listener = vi.fn();
    runtime.subscribe(listener);
    camera.emit(poseFrame(0));

    runtime.stop();
    clock.advance(100);

    expect(clock.pendingTimers).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it("has nothing to report about a frame the patient is not in", () => {
    const runtime = startRuntime();
    const listener = vi.fn();
    runtime.subscribe(listener);

    camera.emit(poseFrame(0, hideAllBut(25, 26)));
    clock.advance(100);

    expect(listener).not.toHaveBeenCalled();
  });
});
