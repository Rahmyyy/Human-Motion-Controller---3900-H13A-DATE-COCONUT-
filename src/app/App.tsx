import { HashRouter, Route, Routes } from "react-router";
import MovementMappingPage from "@/features/movement-mapping/MovementMappingPage";
import PresetMappingsPage from "@/features/presets/PresetMappingsPage";
import PresetSelectionPage from "@/features/presets/PresetSelectionPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PresetSelectionPage />} />
        <Route path="/preset/edit" element={<PresetMappingsPage />} />
        <Route path="/session" element={<MovementMappingPage />} />
      </Routes>
    </HashRouter>
  );
}
