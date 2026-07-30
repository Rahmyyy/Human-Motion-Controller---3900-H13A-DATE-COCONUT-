export interface SessionWindowService {
  openOverlay(patientId: string, presetId: string): Promise<void>;
  closeOverlay(): Promise<void>;
  onSessionEnded(listener: () => void): Promise<() => void>;
}
