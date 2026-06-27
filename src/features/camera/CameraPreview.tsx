import { useEffect, useRef, useState } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import styles from "./CameraPreview.module.css";


export default function CameraPreview() {
    const [imgSrc, setImgSrc] = useState<string>("");
    const prevUrlRef = useRef<string>("");


    const startStream = async () => {
        try {
            const channel = new Channel<Uint8Array>();

            channel.onmessage = (frameBytes) => {
                const pngBytes = new Uint8Array(frameBytes);

                const blob = new Blob([pngBytes], { type: "image/jpeg" });
                const newUrl = URL.createObjectURL(blob);
                setImgSrc(newUrl);

                // Clean up previous blob
                if (prevUrlRef.current) {
                    URL.revokeObjectURL(prevUrlRef.current);
                }
                prevUrlRef.current = newUrl;

            };

            // Initate channel on load
            await invoke("webcam_handler", { channel });

        } catch (error) {
            console.error("Stream Failed:", error);
        }
    };

    useEffect(() => {
        startStream();

        return () => {
            if (prevUrlRef.current) {
                URL.revokeObjectURL(prevUrlRef.current);
            }
        };
    }, []);

    return (
        <div className={styles.preview}>
            <img
                className={styles.img}
                src={imgSrc}
                alt="Webcam Feed"
            />
        </div>
    );
}
