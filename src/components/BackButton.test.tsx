import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import BackButton from "./BackButton";

/** Echoes what the destination route received so navigation can be asserted from the DOM. */
function Destination() {
  const location = useLocation();
  return (
    <p>
      arrived at {location.pathname} with {JSON.stringify(location.state)}
    </p>
  );
}

function renderBackButton(props: React.ComponentProps<typeof BackButton>) {
  return render(
    <MemoryRouter initialEntries={["/start"]}>
      <Routes>
        <Route path="/start" element={<BackButton {...props} />} />
        <Route path="/patients" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BackButton", () => {
  it("labels itself Back when no destination name is given", () => {
    renderBackButton({ to: "/patients" });

    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  /** "Back" alone is ambiguous on nested screens, so callers can name the destination. */
  it("uses the supplied label in place of the default", () => {
    renderBackButton({ to: "/patients", label: "Back to patients" });

    expect(screen.getByRole("button", { name: "Back to patients" })).toBeInTheDocument();
  });

  it("navigates to the destination when clicked", async () => {
    renderBackButton({ to: "/patients" });

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText(/arrived at \/patients/)).toBeInTheDocument();
  });

  /** The destination often needs the record it was showing, which travels as router state. */
  it("hands the supplied router state to the destination", async () => {
    renderBackButton({ to: "/patients", state: { patientId: "patient-1" } });

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText(/with {"patientId":"patient-1"}/)).toBeInTheDocument();
  });

  /** Omitting state must leave the destination with the router's empty default, not a stale value. */
  it("navigates with empty state when none is supplied", async () => {
    renderBackButton({ to: "/patients" });

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText(/with null$/)).toBeInTheDocument();
  });

  /** The chevron is decoration; announcing it would read as noise next to the label. */
  it("hides its chevron from assistive technology", () => {
    const { container } = renderBackButton({ to: "/patients" });

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  /** Inside a form, a button without an explicit type would submit it. */
  it("is not a submit button", () => {
    renderBackButton({ to: "/patients" });

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
