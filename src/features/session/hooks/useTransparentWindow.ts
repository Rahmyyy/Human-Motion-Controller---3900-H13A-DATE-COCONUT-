import { useEffect } from "react";

/**
 * The overlay shares an entrypoint (and therefore a stylesheet) with the main
 * app, whose base layer paints an opaque body background. A Tauri transparent
 * window only shows what is behind it where the page itself is transparent, so
 * this strips that background for as long as the overlay is mounted.
 */
export function useTransparentWindow() {
  useEffect(() => {
    document.documentElement.classList.add("transparent-window");

    return () => {
      document.documentElement.classList.remove("transparent-window");
    };
  }, []);
}
