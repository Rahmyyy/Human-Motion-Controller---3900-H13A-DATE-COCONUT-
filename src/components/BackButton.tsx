import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
      <ChevronLeft className="size-4" aria-hidden="true" />
      Back
    </Button>
  );
}
