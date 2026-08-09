type TimedFrame = {
  timestampMs: number;
};

export function resampleFrames<TFrame extends TimedFrame>(
  frames: TFrame[],
  targetCount: number,
): TFrame[] {
  if (frames.length === 0 || targetCount <= 0) {
    return [];
  }

  if (frames.length === 1 || targetCount === 1) {
    return [frames[0]];
  }

  const sortedFrames = [...frames].sort((first, second) => first.timestampMs - second.timestampMs);
  const startTime = sortedFrames[0].timestampMs;
  const endTime = sortedFrames[sortedFrames.length - 1].timestampMs;
  const durationMs = endTime - startTime;

  if (durationMs <= 0) {
    return evenlyPickFrames(sortedFrames, targetCount);
  }

  return Array.from({ length: targetCount }, (_, index) => {
    const progress = index / (targetCount - 1);
    const targetTime = startTime + durationMs * progress;
    return nearestFrame(sortedFrames, targetTime);
  });
}

function evenlyPickFrames<TFrame>(frames: TFrame[], targetCount: number) {
  if (frames.length <= targetCount) {
    return frames;
  }

  return Array.from({ length: targetCount }, (_, index) => {
    const progress = index / (targetCount - 1);
    const frameIndex = Math.round(progress * (frames.length - 1));
    return frames[frameIndex];
  });
}

function nearestFrame<TFrame extends TimedFrame>(frames: TFrame[], targetTime: number) {
  let nearest = frames[0];
  let nearestDistance = Math.abs(nearest.timestampMs - targetTime);

  for (const frame of frames) {
    const distance = Math.abs(frame.timestampMs - targetTime);
    if (distance < nearestDistance) {
      nearest = frame;
      nearestDistance = distance;
    }
  }

  return nearest;
}
