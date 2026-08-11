import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTransparentWindow } from "./useTransparentWindow";

function Overlay() {
  useTransparentWindow();
  return null;
}

describe("useTransparentWindow", () => {
  /** The overlay shares a stylesheet with the main app, whose base layer paints an opaque body.
   *  A Tauri transparent window only shows through where the page itself is transparent. */
  it("strips the opaque page background while the overlay is mounted", () => {
    render(<Overlay />);

    expect(document.documentElement).toHaveClass("transparent-window");
  });

  /** The main window shares the same document in development, so the class must not linger. */
  it("restores the background once the overlay unmounts", () => {
    render(<Overlay />).unmount();

    expect(document.documentElement).not.toHaveClass("transparent-window");
  });
});
