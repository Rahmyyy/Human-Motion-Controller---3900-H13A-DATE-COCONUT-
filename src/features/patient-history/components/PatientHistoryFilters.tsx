import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_PRESETS,
  DATE_RANGE_LABELS,
  DATE_RANGE_OPTIONS,
  type DateRangeOption,
  type PresetFilterOption,
} from "@/modules/patient-history";

interface PatientHistoryFiltersProps {
  dateRange: DateRangeOption;
  disabled: boolean;
  onDateRangeChange: (range: DateRangeOption) => void;
  onPresetChange: (presetId: string) => void;
  presetId: string;
  presetOptions: PresetFilterOption[];
}

export default function PatientHistoryFilters({
  dateRange,
  disabled,
  onDateRangeChange,
  onPresetChange,
  presetId,
  presetOptions,
}: PatientHistoryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={dateRange}
        disabled={disabled}
        onValueChange={(value) => onDateRangeChange(value as DateRangeOption)}
      >
        <SelectTrigger className="w-44" aria-label="Date range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {DATE_RANGE_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={presetId}
        disabled={disabled || presetOptions.length <= 1}
        onValueChange={onPresetChange}
      >
        <SelectTrigger className="w-44" aria-label="Preset">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presetOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.id === ALL_PRESETS ? option.name : `${option.name} (${option.sessionCount})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
