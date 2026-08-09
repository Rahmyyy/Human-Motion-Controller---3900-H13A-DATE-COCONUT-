import { render, screen } from "@testing-library/react";
import { Clock } from "lucide-react";
import { describe, expect, it } from "vitest";
import PatientHistoryMetricCard from "./PatientHistoryMetricCard";

function renderCard(props: Partial<React.ComponentProps<typeof PatientHistoryMetricCard>> = {}) {
  return render(
    <PatientHistoryMetricCard icon={Clock} label="Total session time" value="1h 42m" {...props} />,
  );
}

describe("PatientHistoryMetricCard", () => {
  /** Values arrive pre-formatted so one card can show a duration as readily as a count. */
  it("shows the value it was handed, unaltered", () => {
    renderCard();

    expect(screen.getByText("1h 42m")).toBeInTheDocument();
    expect(screen.getByText("Total session time")).toBeInTheDocument();
  });

  it("shows the description when one is given", () => {
    renderCard({ description: "Last 30 days" });

    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
  });

  /** Most metrics need no qualifier, and an empty line would leave a gap in the row. */
  it("leaves out the description line when there is none", () => {
    const { container } = renderCard();

    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("hides its icon from assistive technology", () => {
    const { container } = renderCard();

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
