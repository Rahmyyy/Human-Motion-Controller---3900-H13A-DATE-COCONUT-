import { describe, expect, it } from "vitest";
import { getDuplicatePresetName } from "./presetDisplay";

describe("getDuplicatePresetName", () => {
  it("marks the copy so it is distinguishable from its original", () => {
    expect(getDuplicatePresetName("Mario Kart")).toBe("Mario Kart (Copy)");
  });

  /** The name column caps at 60 characters, so the suffix has to fit inside that budget. */
  it("keeps the copy within the name limit", () => {
    const longName = "a".repeat(60);

    const copy = getDuplicatePresetName(longName);

    expect(copy).toHaveLength(60);
    expect(copy.endsWith(" (Copy)")).toBe(true);
  });

  it("leaves a name that already fits untouched apart from the suffix", () => {
    const name = "a".repeat(53);

    expect(getDuplicatePresetName(name)).toBe(`${name} (Copy)`);
  });

  /** Trimming by code point keeps an emoji or accented letter from being cut in half. */
  it("trims whole characters rather than surrogate halves", () => {
    const copy = getDuplicatePresetName("🎮".repeat(60));

    expect(Array.from(copy)).toHaveLength(60);
    expect(copy).not.toContain("�");
  });

  it("still marks an empty name as a copy", () => {
    expect(getDuplicatePresetName("")).toBe(" (Copy)");
  });
});
