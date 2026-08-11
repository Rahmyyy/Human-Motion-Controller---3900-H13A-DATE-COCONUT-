import { HashRouter, Route, Routes } from "react-router";
import MainDashboardPage from "@/features/dashboard/MainDashboardPage";
import MovementMappingRoutePage from "@/features/movement-mapping/MovementMappingRoutePage";
import MovementRecognitionPage from "@/features/movement-recognition/MovementRecognitionPage";
import PatientHistoryPage from "@/features/patient-history/PatientHistoryPage";
import PresetMappingsPage from "@/features/preset-mapping/PresetMappingsPage";
import PresetSelectionPage from "@/features/presets/PresetSelectionPage";
import DefaultPoseCalibrationPage from "@/features/presets/DefaultPoseCalibrationPage";
import LiveSessionPage from "@/features/session/LiveSessionPage";
import SessionOverlayWindow from "@/features/session/SessionOverlayWindow";
import NotFoundPage from "./NotFoundPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainDashboardPage />} />
        <Route path="/patients/:patientId/presets" element={<PresetSelectionPage />} />
        <Route path="/patients/:patientId/history" element={<PatientHistoryPage />} />
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
          path="/patients/:patientId/presets/:presetId/session"
          element={<LiveSessionPage />}
        />
        <Route
          path="/patients/:patientId/presets/:presetId/overlay"
          element={<SessionOverlayWindow />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  );
}
