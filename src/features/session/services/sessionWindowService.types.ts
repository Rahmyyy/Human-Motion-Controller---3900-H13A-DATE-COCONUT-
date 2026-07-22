export interface SessionWindowService {
  openOverlay(presetId: string): Promise<void>;
  closeOverlay(): Promise<void>;
  onSessionEnded(listener: () => void): Promise<() => void>;
}
