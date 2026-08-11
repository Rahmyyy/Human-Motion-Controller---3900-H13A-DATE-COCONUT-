import { describe, expect, it } from "vitest";
import { PressType } from "@/modules/movement-mapping";
import { mapping } from "@/modules/movement-mapping/testMappings";
import { buildMappingStatuses } from "./buildMappingStatuses";
import type { RecognitionMatch } from "../types";

const wave = mapping({ id: "wave", name: "wave", keybind: "Spacebar" });
const nod = mapping({ id: "nod", name: "nod", keybind: "Enter" });

function match(id: string, confidence: number, threshold = 0.6): RecognitionMatch {
  return {
    id,
    name: id,
    keybind: "Spacebar",
    confidence,
    keypressTriggerThreshold: threshold,
    keypressType: PressType.Click,
  };
}

describe("buildMappingStatuses", () => {
  it("shows each movement with the confidence it just scored", () => {
    const statuses = buildMappingStatuses([wave, nod], [match("wave", 0.9), match("nod", 0.2)]);

    expect(statuses.map((status) => status.confidence)).toEqual([0.9, 0.2]);
  });

  it("shows a movement that scored nothing at zero rather than leaving it out", () => {
    const statuses = buildMappingStatuses([wave, nod], [match("wave", 0.9)]);

    expect(statuses).toHaveLength(2);
    expect(statuses[1]).toMatchObject({ id: "nod", confidence: 0, isActive: false });
  });

  it("keeps each movement's own name, key, and press type", () => {
    const [status] = buildMappingStatuses([nod], []);

    expect(status).toMatchObject({ name: "nod", keybind: "Enter", keypressType: "Click" });
  });

  it("reads an unscored movement's trigger threshold from its saved setting", () => {
    const strict = mapping({ id: "wave", keypressTriggerThresholdPercentage: 85 });

    expect(buildMappingStatuses([strict], [])[0]?.keypressTriggerThreshold).toBe(0.85);
  });

  it("highlights the movement that just cleared its threshold", () => {
    const statuses = buildMappingStatuses([wave, nod], [match("wave", 0.9), match("nod", 0.2)]);

    expect(statuses.map((status) => status.isActive)).toEqual([true, false]);
  });

  it("highlights nothing when the best movement is short of its threshold", () => {
    const statuses = buildMappingStatuses([wave], [match("wave", 0.5)]);

    expect(statuses[0]?.isActive).toBe(false);
  });

  /** Too close to resting to be a deliberate movement. */
  it("highlights nothing when the resting pose is nearly as convincing", () => {
    const statuses = buildMappingStatuses([wave], [match("wave", 0.9)], 0.88);

    expect(statuses[0]?.isActive).toBe(false);
  });

  it("highlights nothing while the patient has yet to return to rest", () => {
    const statuses = buildMappingStatuses([wave], [match("wave", 0.9)], 0, false);

    expect(statuses[0]?.isActive).toBe(false);
  });

  it("has no statuses to show for a preset with no movements", () => {
    expect(buildMappingStatuses([], [])).toEqual([]);
  });
});
