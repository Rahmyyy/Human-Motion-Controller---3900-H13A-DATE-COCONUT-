const MAX_PRESET_NAME_LENGTH = 60;
const COPY_SUFFIX = " (Copy)";

export function getDuplicatePresetName(name: string) {
  const availableCharacters = MAX_PRESET_NAME_LENGTH - COPY_SUFFIX.length;
  return `${Array.from(name).slice(0, availableCharacters).join("")}${COPY_SUFFIX}`;
}
