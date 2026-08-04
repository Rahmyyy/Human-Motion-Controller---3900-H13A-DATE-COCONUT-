import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PressType, type Keybind } from "@/modules/movement-mapping";
import { Pencil, SlidersHorizontal } from "lucide-react";
import { type KeyboardEvent } from "react";

const KEYPRESS_TYPE_OPTIONS = [
  { label: "Click", value: PressType.Click },
  { label: "Toggle", value: PressType.Toggle },
  { label: "Press", value: PressType.Press },
  { label: "Release", value: PressType.Release },
];

interface MappingDetailsPanelProps {
  keybind: Keybind | null;
  keypressType: PressType;
  movementName: string;
  onKeybindChange: (keybind: Keybind) => void;
  onKeypressTypeChange: (keypressType: PressType) => void;
  onMovementNameChange: (movementName: string) => void;
}

function formatKeybind(event: KeyboardEvent<HTMLInputElement>) {
  if (event.code === "Space") return "Spacebar";

  switch (event.key) {
    case "Escape":
      return "Esc";
    case "ArrowUp":
      return "Arrow Up";
    case "ArrowDown":
      return "Arrow Down";
    case "ArrowLeft":
      return "Arrow Left";
    case "ArrowRight":
      return "Arrow Right";
    default:
      return event.key.length === 1 ? event.key.toUpperCase() : event.key;
  }
}

export default function MappingDetailsPanel({
  keybind,
  keypressType,
  movementName,
  onKeybindChange,
  onKeypressTypeChange,
  onMovementNameChange,
}: MappingDetailsPanelProps) {
  const captureKeybind = (event: KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    onKeybindChange({
      code: event.code,
      label: formatKeybind(event),
    });

    event.currentTarget.blur();
  };

  return (
    <section className="grid content-start gap-4 rounded-lg border bg-background p-5 shadow-sm">
      <header className="grid gap-1">
        <h2 className="m-0 flex items-center gap-2 text-base font-semibold text-foreground">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
          Mapping Details
        </h2>
        <p className="m-0 text-sm text-muted-foreground">Configure movement properties.</p>
      </header>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="movement-name">
          Movement Name
        </label>
        <div className="relative">
          <Input
            id="movement-name"
            value={movementName}
            onChange={(event) => onMovementNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            placeholder="Name this movement"
            className="pr-9"
          />
          <Pencil
            className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="target-key-action">
          Target Key Action
        </label>
        <div className="relative">
          <Input
            id="target-key-action"
            value={keybind?.label ?? ""}
            onKeyDown={captureKeybind}
            readOnly
            placeholder="Press a key to bind"
            className="pr-9"
          />
          <Pencil
            className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <label
          className="text-xs font-medium text-muted-foreground"
          htmlFor="target-key-action-type"
        >
          Key Action Type
        </label>
        <div className="relative">
          <Select
            value={keypressType}
            onValueChange={(value) => onKeypressTypeChange(value as PressType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {KEYPRESS_TYPE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
