import { describe, expect, it } from "vitest";
import { normalizePoseFrames } from "@/modules/pose-capture";
import { poseFrame, stillPoseFrames, wavingPoseFrames } from "@/modules/pose-capture/testPoses";
import { plan } from "../testPlans";
import { findBestTemplateMatch, findTemplateMatches, trimLiveBuffer } from "./findBestMatch";

const wave = plan("wave", wavingPoseFrames(30));
const rest = plan("rest", stillPoseFrames(30));
const liveWave = normalizePoseFrames(wavingPoseFrames(30));

/** Two seconds of standing still, then the movement — more live frames than any template. */
const liveAfterALongWait = normalizePoseFrames([
  ...stillPoseFrames(50),
  ...wavingPoseFrames(30, 2000),
]);

describe("trimLiveBuffer", () => {
  it("keeps the frames recognition still has a use for", () => {
    const frames = normalizePoseFrames([poseFrame(0), poseFrame(600), poseFrame(3000)]);

    const kept = trimLiveBuffer(frames, 3000);

    expect(kept.map((frame) => frame.timestampMs)).toEqual([600, 3000]);
  });

  it("keeps a frame sitting exactly on the buffer's edge", () => {
    const frames = normalizePoseFrames([poseFrame(500)]);

    expect(trimLiveBuffer(frames, 3000)).toHaveLength(1);
  });

  it("has nothing to keep from an empty buffer", () => {
    expect(trimLiveBuffer([], 3000)).toEqual([]);
  });
});

describe("findTemplateMatches", () => {
  it("scores every movement the preset defines", () => {
    const matches = findTemplateMatches([wave, rest], liveWave);

    expect(matches.map((match) => match.id).sort()).toEqual(["rest", "wave"]);
  });

  it("puts the most convincing movement first", () => {
    const matches = findTemplateMatches([rest, wave], liveWave);

    expect(matches[0]?.id).toBe("wave");
    expect(matches[0]?.confidence).toBeGreaterThan(matches[1]?.confidence ?? 1);
  });

  it("carries each movement's own identity and trigger settings", () => {
    const matches = findTemplateMatches([wave], liveWave);

    expect(matches[0]).toMatchObject({
      id: "wave",
      name: "wave",
      keybind: "Spacebar",
      keypressTriggerThreshold: 0.6,
      keypressType: "Click",
    });
  });

  /** Only the movement's own length of live footage is compared, not the whole buffer. */
  it("compares against just the tail of the buffer the movement needs", () => {
    const matches = findTemplateMatches([wave], liveAfterALongWait);

    expect(matches[0]?.confidence).toBeGreaterThan(0.95);
  });

  it("scores nothing when the patient is not in shot", () => {
    expect(findTemplateMatches([wave], [])[0]?.confidence).toBe(0);
  });

  it("has nothing to score when the preset defines no movements", () => {
    expect(findTemplateMatches([], liveWave)).toEqual([]);
  });
});

describe("findBestTemplateMatch", () => {
  it("picks the most convincing movement", () => {
    expect(findBestTemplateMatch([rest, wave], liveWave)?.id).toBe("wave");
  });

  it("picks nothing when the preset defines no movements", () => {
    expect(findBestTemplateMatch([], liveWave)).toBeNull();
  });
});
