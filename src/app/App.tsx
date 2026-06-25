import { HashRouter, Route, Routes } from "react-router";
import CustomPresetPage from "@/features/presets/CustomPresetPage";
import PresetSelectionPage from "@/features/presets/PresetSelectionPage";
import SessionPage from "@/features/session/SessionPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PresetSelectionPage />} />
        <Route path="/presets/custom" element={<CustomPresetPage />} />
        <Route path="/session" element={<SessionPage />} />
      </Routes>
    </HashRouter>
  );
}
