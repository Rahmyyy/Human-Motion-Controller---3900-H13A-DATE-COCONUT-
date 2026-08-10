import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/global.css";

async function startApp() {
  // The WDIO bridge is bundled only in explicit E2E builds. It gives the desktop runner access to
  // Tauri's window and logging APIs without shipping test instrumentation in production assets.
  if (import.meta.env.MODE === "e2e") {
    await import("@wdio/tauri-plugin");
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void startApp();
