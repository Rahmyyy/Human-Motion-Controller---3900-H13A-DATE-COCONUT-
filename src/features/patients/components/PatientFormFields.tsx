import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PatientStatus } from "@/modules/patient-presets";

type PatientFormFieldsProps = {
  clinicalNotes: string;
  displayName: string;
  idPrefix: string;
  onClinicalNotesChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onStatusChange: (value: PatientStatus) => void;
  status: PatientStatus;
};

export default function PatientFormFields({
  clinicalNotes,
  displayName,
  idPrefix,
  onClinicalNotesChange,
  onDisplayNameChange,
  onStatusChange,
  status,
}: PatientFormFieldsProps) {
  const displayNameId = `${idPrefix}-display-name`;
  const clinicalNotesId = `${idPrefix}-clinical-notes`;
  const statusId = `${idPrefix}-status`;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={displayNameId}>Patient Display Name</Label>
        <Input
          id={displayNameId}
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder="e.g. Alex J."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={clinicalNotesId}>Clinical Notes Optional</Label>
        <Textarea
          id={clinicalNotesId}
          value={clinicalNotes}
          onChange={(event) => onClinicalNotesChange(event.target.value)}
          placeholder="e.g. Stroke rehab, upper body focus"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={statusId}>Status</Label>
        <Select value={status} onValueChange={(value) => onStatusChange(value as PatientStatus)}>
          <SelectTrigger id={statusId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="needsReview">Needs Review</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
