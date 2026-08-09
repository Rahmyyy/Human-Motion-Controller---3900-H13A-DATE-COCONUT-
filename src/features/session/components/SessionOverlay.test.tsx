import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PressType } from "@/modules/movement-mapping";
import type { RecognitionMappingStatus, RecognitionStatus } from "@/modules/recognition";
import SessionOverlay from "./SessionOverlay";

const mappingStatus = (
  overrides: Partial<RecognitionMappingStatus> = {},
): RecognitionMappingStatus => ({
  id: "mapping-1",
  name: "Left arm raise",
  keybind: "A",
  confidence: 0.8,
  keypressTriggerThreshold: 0.6,
  keypressType: PressType.Click,
  isActive: false,
  ...overrides,
});

const status = (overrides: Partial<RecognitionStatus> = {}): RecognitionStatus => ({
  bestMatch: null,
  mappingStatuses: [],
  triggeredMappingId: null,
  waitingForDefaultPose: false,
  error: null,
  ...overrides,
});

function renderOverlay(props: Partial<React.ComponentProps<typeof SessionOverlay>> = {}) {
  const onStop = vi.fn();
  const view = render(
    <SessionOverlay
      elapsedMs={0}
      onStop={onStop}
      presetName="Mario Kart"
      status={status()}
      triggerCount={0}
      {...props}
    />,
  );
  return { onStop, ...view };
}

const bar = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("li div[style]") ?? undefined;

describe("SessionOverlay", () => {
  it("names the preset the session is running", () => {
    renderOverlay();

    expect(screen.getByText("Mario Kart")).toBeInTheDocument();
  });

  /** The whole overlay is draggable by its header so it can be nudged off the game. "deep" is
   *  required, or the icon and label inside would swallow the drag. */
  it("makes its header a deep drag region", () => {
    const { container } = renderOverlay();

    expect(container.querySelector("header")).toHaveAttribute("data-tauri-drag-region", "deep");
  });

  describe("session stats", () => {
    it("shows the duration and trigger count", () => {
      renderOverlay({ elapsedMs: 65_000, triggerCount: 7 });

      expect(screen.getByText("01:05")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("drops the part-second rather than rounding it up", () => {
      renderOverlay({ elapsedMs: 1_999 });

      expect(screen.getByText("00:01")).toBeInTheDocument();
    });
  });

  describe("mapping list", () => {
    it("lists each mapping with its key and confidence", () => {
      renderOverlay({ status: status({ mappingStatuses: [mappingStatus()] }) });

      const entry = screen.getByRole("listitem");
      expect(within(entry).getByText("Left arm raise")).toBeInTheDocument();
      expect(within(entry).getByText("A")).toBeInTheDocument();
      expect(within(entry).getByText("80%")).toBeInTheDocument();
    });

    /** A mapping the recogniser has not scored yet reads as zero rather than blank. */
    it("shows an unscored mapping as zero", () => {
      renderOverlay({
        status: status({
          mappingStatuses: [mappingStatus({ confidence: undefined as unknown as number })],
        }),
      });

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("says so when the preset has no mappings", () => {
      renderOverlay();

      expect(screen.getByText("No mappings saved.")).toBeInTheDocument();
    });

    it("labels the list for assistive technology", () => {
      renderOverlay();

      expect(screen.getByRole("region", { name: "Movement recognition" })).toBeInTheDocument();
    });
  });

  describe("confidence bar", () => {
    it("fills to the mapping's confidence", () => {
      const { container } = renderOverlay({
        status: status({ mappingStatuses: [mappingStatus({ confidence: 0.42 })] }),
      });

      expect(bar(container)).toHaveStyle({ width: "42%" });
    });

    /** A confidence outside 0–1 would otherwise overflow or invert the bar. */
    it.each([
      [1.4, "100%"],
      [-0.2, "0%"],
      [undefined, "0%"],
    ])("clamps a confidence of %s to %s", (confidence, width) => {
      const { container } = renderOverlay({
        status: status({
          mappingStatuses: [mappingStatus({ confidence: confidence as number })],
        }),
      });

      expect(bar(container)).toHaveStyle({ width });
    });
  });

  describe("active highlighting", () => {
    it("marks a matching mapping", () => {
      const { container } = renderOverlay({
        status: status({ mappingStatuses: [mappingStatus({ isActive: true })] }),
      });

      expect(bar(container)).toHaveClass("bg-emerald-400");
    });

    /** The mapping that just fired stays highlighted even once it stops matching. */
    it("marks the mapping that just fired", () => {
      const { container } = renderOverlay({
        status: status({ mappingStatuses: [mappingStatus()], triggeredMappingId: "mapping-1" }),
      });

      expect(bar(container)).toHaveClass("bg-emerald-400");
    });

    it("leaves an idle mapping unhighlighted", () => {
      const { container } = renderOverlay({
        status: status({ mappingStatuses: [mappingStatus()] }),
      });

      expect(bar(container)).toHaveClass("bg-sky-400");
    });
  });

  describe("warnings", () => {
    it("asks for the resting pose while disarmed", () => {
      renderOverlay({ status: status({ waitingForDefaultPose: true }) });

      expect(screen.getByText("Return to the default resting pose to re-arm.")).toBeInTheDocument();
    });

    it("shows a recogniser error", () => {
      renderOverlay({ status: status({ error: "Camera stopped." }) });

      expect(screen.getByText("Camera stopped.")).toBeInTheDocument();
    });

    it("stays quiet while the recogniser is healthy and armed", () => {
      renderOverlay();

      expect(screen.queryByText(/re-arm|stopped/)).not.toBeInTheDocument();
    });
  });

  it("renders the camera preview it is given", () => {
    renderOverlay({ children: <div data-testid="preview" /> });

    expect(screen.getByTestId("preview")).toBeInTheDocument();
  });

  it("offers a way to end the session", async () => {
    const { onStop } = renderOverlay();

    await userEvent.click(screen.getByRole("button", { name: "End Session" }));

    expect(onStop).toHaveBeenCalled();
  });
});
