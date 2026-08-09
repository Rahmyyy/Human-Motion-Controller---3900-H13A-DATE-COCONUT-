import { describe, expect, it } from "vitest";
import { keypressTriggerThresholdFromPercentage } from "@/modules/movement-mapping";
import { PressType } from "@/modules/movement-mapping";
import { selectAcceptedMatch } from "./internal/selectAcceptedMatch";
import type { RecognitionMatch } from "./types";

describe("selectAcceptedMatch", () => {
  it("accepts the best match at its own trigger threshold", () => {
    const match = recognitionMatch("movement-1", 0.6, 0.6);

    expect(selectAcceptedMatch([match])).toBe(match);
  });

  it("rejects the best match below its own trigger threshold", () => {
    const match = recognitionMatch("movement-1", 0.79, 0.8);

    expect(selectAcceptedMatch([match])).toBeNull();
  });

  it("does not fall through to a weaker match with a lower threshold", () => {
    const strictBest = recognitionMatch("strict", 0.79, 0.8);
    const lenientRunnerUp = recognitionMatch("lenient", 0.6, 0.3);

    expect(selectAcceptedMatch([strictBest, lenientRunnerUp])).toBeNull();
  });

  it("preserves the minimum confidence margin between competing movements", () => {
    const best = recognitionMatch("best", 0.7, 0.6);
    const runnerUp = recognitionMatch("runner-up", 0.65, 0.6);

    expect(selectAcceptedMatch([best, runnerUp])).toBeNull();
  });

  it("preserves the confidence margin from the default pose", () => {
    const match = recognitionMatch("movement-1", 0.7, 0.6);

    expect(selectAcceptedMatch([match], 0.65)).toBeNull();
  });
});

describe("keypressTriggerThresholdFromPercentage", () => {
  it("uses the current 60 percent default when the value is missing", () => {
    expect(keypressTriggerThresholdFromPercentage(undefined)).toBe(0.6);
  });

  it("normalizes and clamps persisted percentages to the supported range", () => {
    expect(keypressTriggerThresholdFromPercentage(29)).toBe(0.3);
    expect(keypressTriggerThresholdFromPercentage(75)).toBe(0.75);
    expect(keypressTriggerThresholdFromPercentage(101)).toBe(1);
  });
});

function recognitionMatch(
  id: string,
  confidence: number,
  keypressTriggerThreshold: number,
): RecognitionMatch {
  return {
    id,
    name: id,
    keybind: "Spacebar",
    confidence,
    keypressTriggerThreshold,
    keypressType: PressType.Click,
  };
}
