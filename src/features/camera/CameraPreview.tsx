import { useEffect, useRef } from "react";
import styles from "./CameraPreview.module.css";

interface CameraPreviewProps {
  stream: MediaStream | null;
}

export default function CameraPreview({ stream }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;

    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div className={styles.preview}>
      <video
        ref={videoRef}
        className={styles.video}
        autoPlay
        muted
        playsInline
        aria-label="Live webcam preview"
      />
      {!stream && <p className={styles.placeholder}>Camera preview is off</p>}
    </div>
  );
}
