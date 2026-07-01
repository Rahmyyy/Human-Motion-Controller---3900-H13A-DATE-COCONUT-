import { HashRouter, Route, Routes } from "react-router";
import EditMovementMappingPage from "@/features/movement-mapping/EditMovementMappingPage";
import MovementMappingPage from "@/features/movement-mapping/MovementMappingPage";
import PresetMappingsPage from "@/features/preset-mapping/PresetMappingsPage";
import PresetSelectionPage from "@/features/presets/PresetSelectionPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PresetSelectionPage />} />
        <Route path="/preset/edit" element={<PresetMappingsPage />} />
        <Route path="/preset/edit/:mappingId" element={<EditMovementMappingPage />} />
        <Route path="/session" element={<MovementMappingPage />} />
      </Routes>
    </HashRouter>
  );
}
