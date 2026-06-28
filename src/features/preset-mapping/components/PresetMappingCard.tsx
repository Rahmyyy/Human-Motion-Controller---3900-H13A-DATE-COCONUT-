import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PresetMappingCardData } from "../types";

interface PresetMappingCardProps {
  mapping: PresetMappingCardData;
}

export default function PresetMappingCard({ mapping }: PresetMappingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mapping.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs font-medium text-muted-foreground">Keybind</div>
        <div className="mt-1 text-base font-semibold text-foreground">{mapping.keybind}</div>
      </CardContent>
    </Card>
  );
}
