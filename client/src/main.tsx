import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register the PWA caching service worker at scope "/".
// OneSignal registers its OWN worker separately at /push/onesignal/ (see
// useOneSignal.ts), so the two never conflict.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => console.log("[SW] PWA worker registered:", reg.scope))
      .catch((err) => console.error("[SW] PWA worker registration failed:", err));
  });
}
