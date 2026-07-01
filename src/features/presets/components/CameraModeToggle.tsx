import { useState } from "react";
import { MonitorCog, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCameraMode, setCameraMode, type CameraMode } from "@/features/camera/cameraMode";

const options: Array<{
  label: string;
  mode: CameraMode;
  Icon: typeof MonitorPlay;
}> = [
  { label: "Frontend", mode: "frontend", Icon: MonitorPlay },
  { label: "Backend", mode: "backend", Icon: MonitorCog },
];

export default function CameraModeToggle() {
  const [selectedMode, setSelectedMode] = useState<CameraMode>(() => getCameraMode());

  const handleSelect = (mode: CameraMode) => {
    setSelectedMode(mode);
    setCameraMode(mode);
  };

  return (
    <div className="inline-flex h-10 items-center rounded-lg border bg-muted p-1">
      {options.map(({ Icon, label, mode }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={selectedMode === mode}
          onClick={() => handleSelect(mode)}
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors",
            selectedMode === mode && "bg-background text-foreground shadow-sm",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
