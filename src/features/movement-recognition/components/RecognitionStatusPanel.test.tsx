import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PressType } from "@/modules/movement-mapping";
import type { RecognitionMappingStatus, RecognitionStatus } from "@/modules/recognition";
import RecognitionStatusPanel from "./RecognitionStatusPanel";

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

const recognitionStatus = (overrides: Partial<RecognitionStatus> = {}): RecognitionStatus => ({
  bestMatch: null,
  mappingStatuses: [],
  triggeredMappingId: null,
  waitingForDefaultPose: false,
  error: null,
  ...overrides,
});

function renderPanel(props: Partial<React.ComponentProps<typeof RecognitionStatusPanel>> = {}) {
  return render(
    <RecognitionStatusPanel
      isLoading={false}
      loadError={null}
      status={recognitionStatus()}
      {...props}
    />,
  );
}

describe("RecognitionStatusPanel", () => {
  it("titles itself", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "Recognition" })).toBeInTheDocument();
  });

  describe("headline status", () => {
    it("reports a load in progress", () => {
      renderPanel({ isLoading: true });

      expect(screen.getByText("Loading mappings.")).toBeInTheDocument();
    });

    it("reports a load failure as needing attention", () => {
      renderPanel({ loadError: "Preset not found." });

      expect(screen.getByText("Needs attention.")).toBeInTheDocument();
    });

    /** A recogniser error is just as blocking as a failed load, and reads the same. */
    it("reports a recogniser error as needing attention", () => {
      renderPanel({ status: recognitionStatus({ error: "Camera stopped." }) });

      expect(screen.getByText("Needs attention.")).toBeInTheDocument();
    });

    it("reports an empty preset", () => {
      renderPanel();

      expect(screen.getByText("No mappings.")).toBeInTheDocument();
    });

    /** After a trigger the recogniser disarms until the patient returns to rest. */
    it("asks for the resting pose while disarmed", () => {
      renderPanel({
        status: recognitionStatus({
          mappingStatuses: [mappingStatus()],
          waitingForDefaultPose: true,
        }),
      });

      expect(screen.getByText("Return to the default resting pose to re-arm.")).toBeInTheDocument();
    });

    it("reports a working recogniser as ready", () => {
      renderPanel({ status: recognitionStatus({ mappingStatuses: [mappingStatus()] }) });

      expect(screen.getByText("Ready.")).toBeInTheDocument();
    });
  });

  describe("mapping list", () => {
    it("lists each mapping with its key and confidence", () => {
      renderPanel({ status: recognitionStatus({ mappingStatuses: [mappingStatus()] }) });

      const entry = screen.getByRole("listitem");
      expect(within(entry).getByText("Left arm raise")).toBeInTheDocument();
      expect(within(entry).getByText("Triggering: A")).toBeInTheDocument();
      expect(within(entry).getByText("80%")).toBeInTheDocument();
    });

    it("rounds the confidence to whole percent", () => {
      renderPanel({
        status: recognitionStatus({ mappingStatuses: [mappingStatus({ confidence: 0.756 })] }),
      });

      expect(screen.getByText("76%")).toBeInTheDocument();
    });

    /** A mapping the recogniser has not scored yet reads as zero rather than blank. */
    it("shows an unscored mapping as zero", () => {
      renderPanel({
        status: recognitionStatus({
          mappingStatuses: [mappingStatus({ confidence: undefined as unknown as number })],
        }),
      });

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("says so when the preset has no mappings", () => {
      renderPanel();

      expect(screen.getByText("No mappings saved.")).toBeInTheDocument();
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    });
  });

  describe("active highlighting", () => {
    it("marks a matching mapping as active", () => {
      renderPanel({
        status: recognitionStatus({ mappingStatuses: [mappingStatus({ isActive: true })] }),
      });

      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    /** The mapping that just fired stays highlighted even once it stops matching. */
    it("marks the mapping that just fired as active", () => {
      renderPanel({
        status: recognitionStatus({
          mappingStatuses: [mappingStatus()],
          triggeredMappingId: "mapping-1",
        }),
      });

      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("marks every other mapping as inactive", () => {
      renderPanel({
        status: recognitionStatus({
          mappingStatuses: [mappingStatus(), mappingStatus({ id: "mapping-2", isActive: true })],
          triggeredMappingId: "mapping-2",
        }),
      });

      expect(screen.getByText("Inactive")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  describe("error banner", () => {
    it("shows the load failure", () => {
      renderPanel({ loadError: "Preset not found." });

      expect(screen.getByText("Preset not found.")).toBeInTheDocument();
    });

    it("shows the recogniser error when the load itself succeeded", () => {
      renderPanel({ status: recognitionStatus({ error: "Camera stopped." }) });

      expect(screen.getByText("Camera stopped.")).toBeInTheDocument();
    });

    /** A failed load is the root cause, so it wins over whatever the recogniser reported. */
    it("prefers the load failure over the recogniser error", () => {
      renderPanel({
        loadError: "Preset not found.",
        status: recognitionStatus({ error: "Camera stopped." }),
      });

      expect(screen.getByText("Preset not found.")).toBeInTheDocument();
      expect(screen.queryByText("Camera stopped.")).not.toBeInTheDocument();
    });

    it("stays hidden while nothing is wrong", () => {
      renderPanel();

      expect(screen.queryByText(/not found|stopped/)).not.toBeInTheDocument();
    });
  });
});
