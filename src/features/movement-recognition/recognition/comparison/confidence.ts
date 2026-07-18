export function distanceToConfidence(distance: number) {
  return 1 / (1 + distance);
}
