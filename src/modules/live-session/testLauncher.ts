import { vi } from "vitest";
import type { SessionEndedEvent, SessionSummary } from "./types";

export const sessionSummary = (overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  elapsedMs: 756_000,
  triggerCount: 31,
  triggerCountsByMapping: { "mapping-1": 31 },
  ...overrides,
});

/** Lets the awaits inside a start settle, so the overlay is genuinely mid-open. */
export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Stands in for the overlay window and the native events it sends back. */
export function createLauncherDependencies() {
  let endedListener: ((event: SessionEndedEvent) => void) | null = null;
  const unlisten = vi.fn();

  return {
    createSessionId: vi.fn(() => "session-1"),
    openOverlay: vi.fn().mockResolvedValue(undefined),
    onSessionEnded: vi.fn(async (listener: (event: SessionEndedEvent) => void) => {
      endedListener = listener;
      return unlisten;
    }),
    requestOverlayEnd: vi.fn().mockResolvedValue(undefined),
    unlisten,
    /** Plays back the event the overlay emits as it closes. */
    emitSessionEnded(event: SessionEndedEvent) {
      endedListener?.(event);
    },
  };
}
