import { HashRouter, Route, Routes } from "react-router";
import LiveDashboardPage from "@/features/dashboard/LiveDashboardPage";
import EditMovementMappingPage from "@/features/movement-mapping/EditMovementMappingPage";
import MovementMappingPage from "@/features/movement-mapping/MovementMappingPage";
import MovementRecognitionPage from "@/features/movement-recognition/MovementRecognitionPage";
import PresetMappingsPage from "@/features/preset-mapping/PresetMappingsPage";
import PresetSelectionPage from "@/features/presets/PresetSelectionPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PresetSelectionPage />} />
        <Route path="/presets/:presetId/edit" element={<PresetMappingsPage />} />
        <Route path="/recognition" element={<MovementRecognitionPage />} />
        <Route path="/preset/edit/:mappingId" element={<EditMovementMappingPage />} />
        <Route path="/session" element={<MovementMappingPage />} />
        <Route path="/dashboard" element={<LiveDashboardPage />} />
      </Routes>
    </HashRouter>
  );
}
