import { useCallback, useRef, useState } from "react";
import type { PoseFrame } from "../camera/poseFrame";

export function usePoseRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const framesRef = useRef<PoseFrame[]>([]);

  const startRecording = useCallback(() => {
    framesRef.current = [];
    isRecordingRef.current = true;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    return framesRef.current;
  }, []);

  const recordFrame = useCallback((frame: PoseFrame) => {
    if (isRecordingRef.current) {
      framesRef.current.push(frame);
    }
  }, []);

  return { isRecording, startRecording, stopRecording, recordFrame };
}
