import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

declare global {
  interface Window {
    OneSignalDeferred: ((onesignal: any) => Promise<void> | void)[];
    OneSignal: any;
  }
}

/**
 * Initializes OneSignal Web Push SDK for authenticated users.
 *
 * Service worker strategy:
 *   /OneSignalSDKWorker.js is the filename OneSignal expects by default.
 *   That file imports OneSignalSDK.sw.js AND contains our PWA caching logic.
 *   main.tsx registers /OneSignalSDKWorker.js at scope "/", so there is only
 *   ONE service worker — no scope conflicts.
 *
 * Subscription flow:
 *   1. Register change listener BEFORE init so no event is missed.
 *   2. Init OneSignal (auto-discovers /OneSignalSDKWorker.js — no override).
 *   3. If user already subscribed → save existing ID immediately.
 *   4. Otherwise call requestPermission() → browser shows the prompt.
 *   5. change listener fires once subscription is confirmed → save ID.
 */
export function useOneSignal(): void {
  const { isAuthenticated } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || initialized.current) return;

    const appId = (import.meta as any).env?.VITE_ONESIGNAL_APP_ID as string | undefined;
    if (!appId) {
      console.warn("[OneSignal] VITE_ONESIGNAL_APP_ID not set — push disabled");
      return;
    }

    initialized.current = true;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        // ── Step 1: register change listener BEFORE init ──────────────────
        // This ensures we never miss the subscription event, even if it fires
        // synchronously during init.
        OneSignal.User?.PushSubscription?.addEventListener(
          "change",
          async (event: any) => {
            const id: string | null = event?.current?.id ?? null;
            if (id) {
              console.log("[OneSignal] Subscription change → saving ID:", id);
              await savePlayerIdToBackend(id);
            }
          }
        );

        // ── Step 2: init — OneSignal auto-uses /OneSignalSDKWorker.js ────
        // No serviceWorkerPath override needed because our worker file is
        // already named exactly what OneSignal expects by default.
        await OneSignal.init({
          appId,
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        });

        // ── Step 3: handle already-subscribed users ───────────────────────
        const existingId: string | null = OneSignal.User?.PushSubscription?.id ?? null;
        if (existingId) {
          console.log("[OneSignal] Already subscribed, saving ID:", existingId);
          await savePlayerIdToBackend(existingId);
          return;
        }

        // ── Step 4: request permission (shows browser prompt) ─────────────
        const permission = await OneSignal.Notifications.requestPermission();
        console.log("[OneSignal] Permission result:", permission);

        if (permission !== "granted") return;

        // ── Step 5: permission granted — get fresh ID ─────────────────────
        // The change listener above will fire, but also check synchronously
        // in case it already resolved.
        const newId: string | null = OneSignal.User?.PushSubscription?.id ?? null;
        if (newId) {
          console.log("[OneSignal] New subscription ID:", newId);
          await savePlayerIdToBackend(newId);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[OneSignal] Init error: ${msg}`);
      }
    });
  }, [isAuthenticated]);
}

async function savePlayerIdToBackend(playerId: string): Promise<void> {
  try {
    await api.post("/user/push-subscription", { playerId });
    console.log(`[OneSignal] Player ID saved to backend: ${playerId}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[OneSignal] Failed to save player ID: ${msg}`);
  }
}
