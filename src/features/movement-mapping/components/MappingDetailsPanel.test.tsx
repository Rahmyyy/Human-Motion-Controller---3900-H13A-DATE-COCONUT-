import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PressType } from "@/modules/movement-mapping";
import MappingDetailsPanel from "./MappingDetailsPanel";

function renderPanel(props: Partial<React.ComponentProps<typeof MappingDetailsPanel>> = {}) {
  const handlers = {
    onKeybindChange: vi.fn(),
    onKeypressTypeChange: vi.fn(),
    onMovementNameChange: vi.fn(),
  };
  render(
    <MappingDetailsPanel
      keybind={null}
      keypressType={PressType.Click}
      movementName=""
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

const nameField = () => screen.getByLabelText("Movement Name");
const keybindField = () => screen.getByLabelText("Target Key Action");

describe("MappingDetailsPanel", () => {
  it("titles itself and says what it configures", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "Mapping Details" })).toBeInTheDocument();
    expect(screen.getByText("Configure movement properties.")).toBeInTheDocument();
  });

  describe("movement name", () => {
    /** The field is controlled by the editor, so each keystroke is reported rather than kept. */
    it("reports the edited name to its handler", async () => {
      const { onMovementNameChange } = renderPanel({ movementName: "Wav" });

      await userEvent.type(nameField(), "e");

      expect(onMovementNameChange).toHaveBeenCalledWith("Wave");
    });

    it("shows the name it was given", () => {
      renderPanel({ movementName: "Left arm raise" });

      expect(nameField()).toHaveValue("Left arm raise");
    });

    /** Enter has nothing to submit here, so it just confirms the name and drops focus. */
    it("leaves the field on Enter", async () => {
      renderPanel();

      nameField().focus();
      await userEvent.keyboard("{Enter}");

      expect(nameField()).not.toHaveFocus();
    });
  });

  describe("keybind capture", () => {
    it("prompts for a key until one is bound", () => {
      renderPanel();

      expect(keybindField()).toHaveValue("");
      expect(keybindField()).toHaveAttribute("placeholder", "Press a key to bind");
    });

    it("shows the label of the bound key", () => {
      renderPanel({ keybind: { code: "Space", label: "Spacebar" } });

      expect(keybindField()).toHaveValue("Spacebar");
    });

    /** The field records the key rather than typing it, so it stays read-only. */
    it("does not accept typed text", () => {
      renderPanel();

      expect(keybindField()).toHaveAttribute("readonly");
    });

    it("captures a plain letter as an upper-case label", async () => {
      const { onKeybindChange } = renderPanel();

      keybindField().focus();
      await userEvent.keyboard("a");

      expect(onKeybindChange).toHaveBeenCalledWith({ code: "KeyA", label: "A" });
    });

    /** The space bar has no printable label, and Esc reads better than Escape on a key cap. */
    it.each([
      ["{ }", "Space", "Spacebar"],
      ["{Escape}", "Escape", "Esc"],
      ["{ArrowUp}", "ArrowUp", "Arrow Up"],
      ["{ArrowDown}", "ArrowDown", "Arrow Down"],
      ["{ArrowLeft}", "ArrowLeft", "Arrow Left"],
      ["{ArrowRight}", "ArrowRight", "Arrow Right"],
    ])("captures %s as %s", async (typed, code, label) => {
      const { onKeybindChange } = renderPanel();

      keybindField().focus();
      await userEvent.keyboard(typed);

      expect(onKeybindChange).toHaveBeenCalledWith({ code, label });
    });

    /** Multi-character keys already read well, so they are recorded as the browser names them. */
    it("captures a named key unchanged", async () => {
      const { onKeybindChange } = renderPanel();

      keybindField().focus();
      await userEvent.keyboard("{Shift}");

      expect(onKeybindChange).toHaveBeenCalledWith({ code: "ShiftLeft", label: "Shift" });
    });

    /** Blurring after capture stops a second key from silently overwriting the first. */
    it("releases focus once a key is captured", async () => {
      renderPanel();

      keybindField().focus();
      await userEvent.keyboard("a");

      expect(keybindField()).not.toHaveFocus();
    });
  });

  describe("key action type", () => {
    it("shows the current press type", () => {
      renderPanel({ keypressType: PressType.Toggle });

      expect(screen.getByRole("combobox")).toHaveTextContent("Toggle");
    });

    it("offers every press type", async () => {
      renderPanel();

      await userEvent.click(screen.getByRole("combobox"));

      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Click",
        "Toggle",
        "Press",
        "Release",
      ]);
    });

    it("reports the chosen press type", async () => {
      const { onKeypressTypeChange } = renderPanel();

      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(screen.getByRole("option", { name: "Release" }));

      expect(onKeypressTypeChange).toHaveBeenCalledWith(PressType.Release);
    });
  });
});
