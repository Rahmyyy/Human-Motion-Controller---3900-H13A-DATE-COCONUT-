import { parsePoseFrames, type PoseFrame } from "@/modules/pose-capture";

export const deserializeMappingPoseFrames = (value: string): PoseFrame[] => parsePoseFrames(value);

export const serializeMappingPoseFrames = (frames: PoseFrame[]) => JSON.stringify(frames);
