const DAY_IN_MILLISECONDS = 86_400_000;
const MAX_PRESET_NAME_LENGTH = 60;
const COPY_SUFFIX = " (Copy)";

export function formatPresetAge(createdAt: string, now = Date.now()) {
  const timestamp = Number(createdAt) * 1000;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;

  const days = Math.max(0, Math.floor((now - timestamp) / DAY_IN_MILLISECONDS));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months < 2) return `${Math.floor(days / 7)} weeks ago`;
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

export function getDuplicatePresetName(name: string) {
  const availableCharacters = MAX_PRESET_NAME_LENGTH - COPY_SUFFIX.length;
  return `${Array.from(name).slice(0, availableCharacters).join("")}${COPY_SUFFIX}`;
}
