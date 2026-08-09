import { useState } from "react";
import { CalendarIcon, CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Patient } from "@/modules/patient-presets";
import {
  combineLocalDateAndTime,
  createScheduledSession,
  getNextHalfHour,
  toTimeInputValue,
} from "@/modules/scheduling";

interface AddSessionDialogProps {
  onSessionCreated(): Promise<void>;
  patients: Patient[];
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });

export default function AddSessionDialog({ onSessionCreated, patients }: AddSessionDialogProps) {
  const initialDateTime = getNextHalfHour();
  const [isOpen, setIsOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDateTime);
  const [time, setTime] = useState(toTimeInputValue(initialDateTime));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function resetForm() {
    const nextDateTime = getNextHalfHour();
    setPatientId("");
    setSelectedDate(nextDateTime);
    setTime(toTimeInputValue(nextDateTime));
    setError(null);
  }

  async function submitSession() {
    if (!patientId || !selectedDate || !time) {
      setError("Select a patient, date, and time.");
      return;
    }

    const scheduledAtMs = combineLocalDateAndTime(selectedDate, time);
    if (scheduledAtMs === null || scheduledAtMs <= Date.now()) {
      setError("Scheduled session must be in the future.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await createScheduledSession(patientId, scheduledAtMs);
      await onSessionCreated();
      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to create scheduled session", error);
      setError(error instanceof Error ? error.message : "Failed to create session.");
    } finally {
      setIsSaving(false);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open && !isSaving) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          className="gap-2"
          disabled={patients.length === 0}
          title={patients.length === 0 ? "Add a patient before scheduling a session" : undefined}
        >
          <CalendarPlus className="size-4" aria-hidden="true" />
          Add Session
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Session</DialogTitle>
          <DialogDescription>Schedule an upcoming session for a patient.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="session-patient">Patient</Label>
            <Select value={patientId} onValueChange={setPatientId} disabled={isSaving}>
              <SelectTrigger id="session-patient" className="w-full">
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal"
                    disabled={isSaving}
                  >
                    <CalendarIcon className="size-4" aria-hidden="true" />
                    {selectedDate ? dateFormatter.format(selectedDate) : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={{ before: today }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-time">Time</Label>
              <Input
                id="session-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={submitSession} disabled={isSaving}>
            {isSaving ? "Scheduling..." : "Schedule Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
