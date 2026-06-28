import { HashRouter, Route, Routes } from "react-router";
import PresetMappingsPage from "@/features/presets/PresetMappingsPage";
import PresetSelectionPage from "@/features/presets/PresetSelectionPage";
import SessionPage from "@/features/session/SessionPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PresetSelectionPage />} />
        <Route path="/preset/edit" element={<PresetMappingsPage />} />
        <Route path="/session" element={<SessionPage />} />
      </Routes>
    </HashRouter>
  );
}
