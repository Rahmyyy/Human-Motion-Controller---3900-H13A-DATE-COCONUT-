import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";

interface BackButtonProps {
  /** Names the destination when "Back" alone would be ambiguous. */
  label?: string;
  /** Router state to hand back to the destination, such as the patient it was showing. */
  state?: unknown;
  to: string;
}

export default function BackButton({ label = "Back", state, to }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button type="button" variant="ghost" onClick={() => navigate(to, { state })}>
      <ChevronLeft className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
