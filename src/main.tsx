import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "./app/App.css";
import { VoiceDestinationSelectorApp } from "./features/chat-shortcuts/VoiceDestinationSelectorApp";
import { getCurrentWindow } from "@tauri-apps/api/window";

const root = document.getElementById("root");

if (!root) {
  throw new Error("QoLayer root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    {getCurrentWindow().label === "voice-selector" ? <VoiceDestinationSelectorApp /> : <App />}
  </StrictMode>,
);
