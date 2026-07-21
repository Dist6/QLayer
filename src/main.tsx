import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { App } from "./app/App";
import "./app/App.css";
import { VoiceDestinationSelectorApp } from "./features/chat-shortcuts/VoiceDestinationSelectorApp";

const root = document.getElementById("root");

if (!root) {
  throw new Error("QoLayer root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    {isTauri() && getCurrentWindow().label === "voice-selector" ? (
      <VoiceDestinationSelectorApp />
    ) : (
      <App />
    )}
  </StrictMode>,
);
