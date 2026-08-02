import type { SessionSummary } from "./sessionSummary.types";

export interface SessionWindowService {
  openOverlay(patientId: string, presetId: string): Promise<void>;
  closeOverlay(summary: SessionSummary): Promise<void>;
  onSessionEnded(listener: (summary: SessionSummary) => void): Promise<() => void>;
  /** Asks the overlay window to end its own session (it owns the live stats). */
  requestOverlayEnd(): Promise<void>;
}
