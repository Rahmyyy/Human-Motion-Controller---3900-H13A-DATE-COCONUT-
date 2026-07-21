import { HashRouter, Route, Routes } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import LiveDashboardPage from "@/features/dashboard/LiveDashboardPage";
import MainDashboardPage from "@/features/dashboard/MainDashboardPage";
import EditMovementMappingPage from "@/features/movement-mapping/EditMovementMappingPage";
import MovementMappingPage from "@/features/movement-mapping/MovementMappingPage";
import MovementRecognitionPage from "@/features/movement-recognition/MovementRecognitionPage";
import PatientsPage from "@/features/patients/PatientsPage";
import PresetMappingsPage from "@/features/preset-mapping/PresetMappingsPage";
import PresetSelectionPage from "@/features/presets/PresetSelectionPage";
import SessionHistoryPage from "@/features/sessions/SessionHistoryPage";
import DefaultPoseCalibrationPage from "@/features/presets/DefaultPoseCalibrationPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<PresetSelectionPage />} />
          <Route path="/dashboard" element={<MainDashboardPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/session-history" element={<SessionHistoryPage />} />
        </Route>
        <Route path="/presets/:presetId/edit" element={<PresetMappingsPage />} />
        <Route path="/presets/:presetId/default-pose" element={<DefaultPoseCalibrationPage />} />
        <Route path="/presets/:presetId/recognition" element={<MovementRecognitionPage />} />
        <Route
          path="/presets/:presetId/movements/:mappingId/edit"
          element={<EditMovementMappingPage />}
        />
        <Route path="/presets/:presetId/movements/new" element={<MovementMappingPage />} />
        <Route path="/presets/:presetId/dashboard" element={<LiveDashboardPage />} />
      </Routes>
    </HashRouter>
  );
}
