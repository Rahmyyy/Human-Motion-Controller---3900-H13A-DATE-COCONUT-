import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";

interface BackButtonProps {
  to: string;
}

export default function BackButton({ to }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button type="button" variant="ghost" onClick={() => navigate(to)}>
      <ChevronLeft className="size-4" aria-hidden="true" />
      Back
    </Button>
  );
}
