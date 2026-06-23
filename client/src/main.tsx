import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// OneSignalSDKWorker.js is the single service worker for this PWA.
// It imports OneSignal's push SDK AND contains the PWA caching logic,
// so there is exactly ONE worker at scope "/" — no conflicts on any device.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/OneSignalSDKWorker.js", { scope: "/" })
      .then((reg) => console.log("[SW] Registered:", reg.scope))
      .catch((err) => console.error("[SW] Registration failed:", err));
  });
}
