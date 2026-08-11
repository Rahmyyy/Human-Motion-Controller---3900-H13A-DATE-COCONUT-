import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveSession } from "./hooks/useLiveSession";
import SessionOverlayWindow from "./SessionOverlayWindow";

vi.mock("./hooks/useLiveSession", () => ({ useLiveSession: vi.fn() }));
// The preview owns a camera and the MediaPipe model, both covered by their own suites.
vi.mock("@/features/camera/MediaPipePosePreview", () => ({
  default: () => <div data-testid="live-preview" />,
}));
vi.mock("./components/SessionOverlay", () => ({
  default: ({
    children,
    elapsedMs,
    onStop,
    presetName,
    triggerCount,
  }: {
    children?: React.ReactNode;
    elapsedMs: number;
    onStop: () => void;
    presetName: string;
    triggerCount: number;
  }) => (
    <div
      data-testid="overlay"
      data-preset-name={presetName}
      data-elapsed={elapsedMs}
      data-triggers={triggerCount}
    >
      <button type="button" onClick={onStop}>
        stop
      </button>
      {children}
    </div>
  ),
}));

const endSession = vi.fn();

function renderWindow(path = "/overlay/patient-1/preset-1?sessionId=session-1") {
  vi.mocked(useLiveSession).mockReturnValue({
    elapsedMs: 65_000,
    endSession,
    phase: "running",
    presetName: "Mario Kart",
    recognitionStatus: {
      bestMatch: null,
      mappingStatuses: [],
      triggeredMappingId: null,
      waitingForDefaultPose: false,
      error: null,
    },
    triggerCount: 7,
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/overlay/:patientId/:presetId" element={<SessionOverlayWindow />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SessionOverlayWindow", () => {
  /** The session id arrives as a query parameter, not a route segment. */
  it("runs the session named by the route and the query string", () => {
    renderWindow();

    expect(useLiveSession).toHaveBeenCalledWith("patient-1", "preset-1", "session-1");
  });

  /** The window can be opened without a session id while one is still being created. */
  it("runs without a session id when the query string omits one", () => {
    renderWindow("/overlay/patient-1/preset-1");

    expect(useLiveSession).toHaveBeenCalledWith("patient-1", "preset-1", undefined);
  });

  it("hands the session state to the overlay", () => {
    renderWindow();

    expect(screen.getByTestId("overlay")).toHaveAttribute("data-preset-name", "Mario Kart");
    expect(screen.getByTestId("overlay")).toHaveAttribute("data-elapsed", "65000");
    expect(screen.getByTestId("overlay")).toHaveAttribute("data-triggers", "7");
  });

  /** Recognition runs in this window, so the camera preview lives here too. */
  it("embeds the camera preview inside the overlay", () => {
    renderWindow();

    expect(screen.getByTestId("live-preview")).toBeInTheDocument();
  });

  it("ends the session from the overlay's stop control", async () => {
    renderWindow();

    await userEvent.click(screen.getByRole("button", { name: "stop" }));

    expect(endSession).toHaveBeenCalled();
  });

  /** The window is transparent, so the app's opaque page background is stripped while mounted. */
  it("makes the window transparent while it is open", () => {
    const { unmount } = renderWindow();
    expect(document.documentElement).toHaveClass("transparent-window");

    unmount();

    expect(document.documentElement).not.toHaveClass("transparent-window");
  });
});
