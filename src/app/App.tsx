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
