export interface PresetMappingCardData {
  id: string;
  name: string;
  keybind: string;
  poseFramesJson: string;
  /**
   * Tracked-landmark indices the user chose as relevant for this movement. An empty array means
   * "all tracked landmarks" — recognition then behaves exactly as it did before landmark selection.
   */
  selectedLandmarks: number[];
  /** Percentage of the baseline movement required for recognition. */
  thresholdPercentage: number;
}
