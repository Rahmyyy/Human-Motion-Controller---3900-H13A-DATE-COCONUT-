import { HashRouter, Route, Routes } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import LiveDashboardPage from "@/features/dashboard/LiveDashboardPage";
import MainDashboardPage from "@/features/dashboard/MainDashboardPage";
import MovementMappingRoutePage from "@/features/movement-mapping/MovementMappingRoutePage";
import MovementRecognitionPage from "@/features/movement-recognition/MovementRecognitionPage";
import PatientListPage from "@/features/patients/PatientListPage";
import PresetMappingsPage from "@/features/preset-mapping/PresetMappingsPage";
import PresetSelectionPage from "@/features/presets/PresetSelectionPage";
import SessionHistoryPage from "@/features/session/SessionHistoryPage";
import DefaultPoseCalibrationPage from "@/features/presets/DefaultPoseCalibrationPage";
import LiveSessionPage from "@/features/session/LiveSessionPage";
import SessionOverlayWindow from "@/features/session/SessionOverlayWindow";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<PatientListPage />} />
          <Route path="/dashboard" element={<MainDashboardPage />} />
          <Route path="/patients" element={<PatientListPage />} />
          <Route path="/session-history" element={<SessionHistoryPage />} />
        </Route>
        <Route path="/patients/:patientId/presets" element={<PresetSelectionPage />} />
        <Route
          path="/patients/:patientId/presets/:presetId/edit"
          element={<PresetMappingsPage />}
        />
        <Route
          path="/patients/:patientId/presets/:presetId/default-pose"
          element={<DefaultPoseCalibrationPage />}
        />
        <Route
          path="/patients/:patientId/presets/:presetId/recognition"
          element={<MovementRecognitionPage />}
        />
        <Route
          path="/patients/:patientId/presets/:presetId/movements/:mappingId/edit"
          element={<MovementMappingRoutePage />}
        />
        <Route
          path="/patients/:patientId/presets/:presetId/movements/new"
          element={<MovementMappingRoutePage />}
        />
        <Route
          path="/patients/:patientId/presets/:presetId/dashboard"
          element={<LiveDashboardPage />}
        />
        <Route
          path="/patients/:patientId/presets/:presetId/session"
          element={<LiveSessionPage />}
        />
        <Route
          path="/patients/:patientId/presets/:presetId/overlay"
          element={<SessionOverlayWindow />}
        />
      </Routes>
    </HashRouter>
  );
}
