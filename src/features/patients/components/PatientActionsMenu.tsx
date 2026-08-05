import { MoreHorizontal, Pencil } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import type { Patient } from "@/modules/patient-presets";

type PatientActionsMenuProps = {
  onModify: (patient: Patient) => void;
  patient: Patient;
};

export default function PatientActionsMenu({
  onModify,
  patient,
}: PatientActionsMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${patient.displayName}`}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-32 rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuPrimitive.Item
            className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-none select-none focus:bg-muted"
            onSelect={() => onModify(patient)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Modify
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}