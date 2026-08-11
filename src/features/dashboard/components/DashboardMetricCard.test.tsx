import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { describe, expect, it } from "vitest";
import DashboardMetricCard from "./DashboardMetricCard";

function renderCard(props: Partial<React.ComponentProps<typeof DashboardMetricCard>> = {}) {
  return render(
    <DashboardMetricCard
      description="Patients under care"
      icon={Users}
      label="Active Patients"
      value={7}
      {...props}
    />,
  );
}

describe("DashboardMetricCard", () => {
  it("shows the metric value with its label and description", () => {
    renderCard();

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Active Patients")).toBeInTheDocument();
    expect(screen.getByText("Patients under care")).toBeInTheDocument();
  });

  /** Zero is a real reading, not a missing one, so it must not be blanked out. */
  it("shows a zero reading", () => {
    renderCard({ value: 0 });

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  /** The icon repeats what the label already says, so it is decoration only. */
  it("hides its icon from assistive technology", () => {
    const { container } = renderCard();

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
