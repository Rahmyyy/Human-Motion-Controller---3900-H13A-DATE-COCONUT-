import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PatientFormFieldsProps = {
  clinicalNotes: string;
  displayName: string;
  idPrefix: string;
  onClinicalNotesChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
};

export default function PatientFormFields({
  clinicalNotes,
  displayName,
  idPrefix,
  onClinicalNotesChange,
  onDisplayNameChange,
}: PatientFormFieldsProps) {
  const displayNameId = `${idPrefix}-display-name`;
  const clinicalNotesId = `${idPrefix}-clinical-notes`;

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
    </div>
  );
}
