import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TRACKED_LANDMARKS } from "@/modules/pose-capture";
import LandmarkSelectionPanel from "./LandmarkSelectionPanel";

function renderPanel(value: number[] = [], disabled = false) {
  const onChange = vi.fn();
  render(<LandmarkSelectionPanel value={value} onChange={onChange} disabled={disabled} />);
  return { onChange };
}

const dot = (name: string) => screen.getByRole("checkbox", { name });

describe("LandmarkSelectionPanel", () => {
  it("titles itself and marks the setting optional", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: /Relevant Landmarks/ })).toBeInTheDocument();
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("draws a body diagram with one dot per tracked landmark", () => {
    renderPanel();

    expect(screen.getByRole("group", { name: "Body landmark selector" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(TRACKED_LANDMARKS.length);
  });

  describe("summary", () => {
    it("says nothing is selected when the diagram is empty", () => {
      renderPanel();

      expect(screen.getByText("No points selected")).toBeInTheDocument();
    });

    it("names the count while a subset is selected", () => {
      renderPanel([11, 12]);

      expect(
        screen.getByText(`Focusing on 2 of ${TRACKED_LANDMARKS.length} points`),
      ).toBeInTheDocument();
      expect(screen.getByText(`2 of ${TRACKED_LANDMARKS.length} selected`)).toBeInTheDocument();
    });

    /** A full selection is the default whole-body case, worth saying in plain words. */
    it("says the whole body is in use when every point is selected", () => {
      renderPanel([...TRACKED_LANDMARKS]);

      expect(screen.getByText("Using all body points")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("marks the selected dots as checked", () => {
      renderPanel([11]);

      expect(dot("Left Shoulder")).toHaveAttribute("aria-checked", "true");
      expect(dot("Right Shoulder")).toHaveAttribute("aria-checked", "false");
    });

    it("adds a landmark that was not selected", async () => {
      const { onChange } = renderPanel([11]);

      await userEvent.click(dot("Right Shoulder"));

      expect(onChange).toHaveBeenCalledWith([11, 12]);
    });

    it("removes a landmark that was already selected", async () => {
      const { onChange } = renderPanel([11, 12]);

      await userEvent.click(dot("Left Shoulder"));

      expect(onChange).toHaveBeenCalledWith([12]);
    });

    it("selects every landmark at once", async () => {
      const { onChange } = renderPanel([11]);

      await userEvent.click(screen.getByRole("button", { name: "Select all" }));

      expect(onChange).toHaveBeenCalledWith([...TRACKED_LANDMARKS]);
    });

    it("clears the whole selection at once", async () => {
      const { onChange } = renderPanel([11, 12]);

      await userEvent.click(screen.getByRole("button", { name: "Clear" }));

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  // The dots are SVG groups rather than real checkboxes, so keyboard support is hand-written.
  describe("keyboard control", () => {
    it.each(["{Enter}", " "])("toggles the focused dot with %s", async (key) => {
      const { onChange } = renderPanel([]);

      dot("Left Shoulder").focus();
      await userEvent.keyboard(key);

      expect(onChange).toHaveBeenCalledWith([11]);
    });

    it("leaves other keys to the browser", async () => {
      const { onChange } = renderPanel([]);

      dot("Left Shoulder").focus();
      await userEvent.keyboard("{Tab}");

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // Selection is locked during a capture so the frames and the landmark set cannot disagree.
  describe("while disabled", () => {
    it("ignores a click on a dot", async () => {
      const { onChange } = renderPanel([11], true);

      await userEvent.click(dot("Right Shoulder"));

      expect(onChange).not.toHaveBeenCalled();
    });

    it("takes the dots out of the tab order", () => {
      renderPanel([11], true);

      expect(dot("Left Shoulder")).toHaveAttribute("tabindex", "-1");
    });

    it("disables the bulk controls", () => {
      renderPanel([11], true);

      expect(screen.getByRole("button", { name: "Select all" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
    });
  });

  it("keeps the dots focusable while enabled", () => {
    renderPanel([11]);

    expect(dot("Left Shoulder")).toHaveAttribute("tabindex", "0");
  });

  /** The bones and the dots come from separate tables; a bone naming an undrawn dot is dropped
   *  rather than crashing the diagram. */
  it("drops a bone that points at a landmark it does not draw", async () => {
    vi.resetModules();
    vi.doMock("../landmarks/landmarkDiagram", () => ({
      LANDMARK_DIAGRAM_WIDTH: 100,
      LANDMARK_DIAGRAM_HEIGHT: 150,
      LANDMARK_DIAGRAM_NODES: [{ index: 11, name: "Left Shoulder", x: 38, y: 40 }],
      LANDMARK_DIAGRAM_CONNECTIONS: [[11, 12]],
    }));
    const { default: PanelWithDanglingBone } = await import("./LandmarkSelectionPanel");

    const { container } = render(<PanelWithDanglingBone value={[]} onChange={vi.fn()} />);

    expect(container.querySelectorAll("line")).toHaveLength(0);
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });
});

afterEach(() => {
  vi.doUnmock("../landmarks/landmarkDiagram");
  vi.resetModules();
});
