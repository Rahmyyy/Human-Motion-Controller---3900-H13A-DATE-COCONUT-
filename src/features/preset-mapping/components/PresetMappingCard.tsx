import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PresetMappingCardData } from "../types";

interface PresetMappingCardProps {
  mapping: PresetMappingCardData;
}

interface KeybindBadgeProps {
  keybind: string;
}

function KeybindBadge({ keybind }: KeybindBadgeProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 shadow-xs">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Keybind
      </span>
      <kbd className="rounded-md bg-slate-700 px-3 py-1.5 font-mono text-sm font-semibold leading-none text-white shadow-sm">
        {keybind}
      </kbd>
    </div>
  );
}

export default function PresetMappingCard({ mapping }: PresetMappingCardProps) {
  return (
    <Card className="transition-colors hover:bg-muted/30">
      <CardHeader className="pb-1">
        <CardTitle className="text-xl font-semibold leading-tight text-foreground">
          {mapping.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        <KeybindBadge keybind={mapping.keybind} />
      </CardContent>
    </Card>
  );
}
