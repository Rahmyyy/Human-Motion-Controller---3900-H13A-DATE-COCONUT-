import { useEffect, useState, useSyncExternalStore } from "react";
import { createPatientHistory } from "@/modules/patient-history";

export function usePatientHistory(patientId: string | undefined) {
  const [service] = useState(createPatientHistory);
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  useEffect(() => {
    void service.start(patientId);
    return service.dispose;
  }, [patientId, service]);

  return {
    ...snapshot,
    retry: service.retry,
    setDateRange: service.setDateRange,
    setPresetId: service.setPresetId,
  };
}
