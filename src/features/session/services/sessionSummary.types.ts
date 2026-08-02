/** Final stats for one completed session, carried from the overlay window to the main window. */
export interface SessionSummary {
  elapsedMs: number;
  triggerCount: number;
  triggerCountsByMapping: Record<string, number>;
}
