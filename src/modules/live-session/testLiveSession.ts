import { vi } from "vitest";
import { emptyRecognitionStatus } from "./presetRecognition";
import type { EndSessionRequestedEvent, PresetRecognitionSnapshot } from "./types";

export const recognitionSnapshot = (
  overrides: Partial<PresetRecognitionSnapshot> = {},
): PresetRecognitionSnapshot => ({
  error: null,
  phase: "running",
  presetName: "Mario Kart",
  recognitionStatus: emptyRecognitionStatus(),
  ...overrides,
});

/** A stand-in for the preset recognition the overlay drives. */
export function createRecognitionStub(snapshot = recognitionSnapshot()) {
  const listeners = new Set<() => void>();
  let current = snapshot;

  return {
    runtime: {
      getSnapshot: () => current,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      start: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
    },
    /** Publishes a fresh recognition snapshot, as the real runtime does mid-session. */
    publish(next: PresetRecognitionSnapshot) {
      current = next;
      listeners.forEach((listener) => listener());
    },
  };
}

/** The native side of an overlay session: end requests, history writes, and window closing. */
export function createLiveSessionDependencies(
  recognition: ReturnType<typeof createRecognitionStub>,
) {
  let endListener: ((event: EndSessionRequestedEvent) => void) | null = null;
  const unlisten = vi.fn(() => {
    endListener = null;
  });

  return {
    createRecognition: vi.fn(() => recognition.runtime),
    onEndRequested: vi.fn(async (listener: (event: EndSessionRequestedEvent) => void) => {
      endListener = listener;
      return unlisten;
    }),
    closeOverlay: vi.fn().mockResolvedValue(undefined),
    recordPatientActivity: vi.fn().mockResolvedValue(undefined),
    recordCompletedSession: vi.fn().mockResolvedValue(undefined),
    unlisten,
    /** Plays back the main window asking this overlay to stop. */
    requestEnd(sessionId: string) {
      endListener?.({ sessionId });
    },
  };
}

export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
