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
 * Initializes OneSignal Web Push (SDK v16) for authenticated users.
 *
 * Service-worker isolation (fixes intermittent recipients: 0):
 *   OneSignal registers its own worker at /push/onesignal/ (its own scope),
 *   while our PWA caching worker stays at /sw.js (scope "/"). Previously both
 *   fought for scope "/", flipping the push subscription on/off across reloads.
 *
 * Explicit opt-in:
 *   `Notifications.requestPermission()` grants *browser* permission but does
 *   not enable the OneSignal subscription. We call
 *   `OneSignal.User.PushSubscription.optIn()` so notification_types is set and
 *   OneSignal actually delivers.
 *
 * Stable targeting:
 *   `OneSignal.login(userId)` attaches our backend user id as external_id, so
 *   the server targets by external_id (stable) with subscription id fallback.
 */
export function useOneSignal(): void {
  const { isAuthenticated, user } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || initialized.current) return;

    const appId = (import.meta as any).env?.VITE_ONESIGNAL_APP_ID as string | undefined;
    if (!appId) {
      console.warn("[OneSignal] VITE_ONESIGNAL_APP_ID not set — push disabled");
      return;
    }

    initialized.current = true;
    const externalId = user.id;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        // Register the change listener BEFORE init so we never miss the event
        // that fires once the subscription becomes active.
        OneSignal.User?.PushSubscription?.addEventListener("change", async (event: any) => {
          const id: string | null = event?.current?.id ?? null;
          const optedIn: boolean = event?.current?.optedIn ?? false;
          console.log("[OneSignal] Subscription change → id:", id, "optedIn:", optedIn);
          if (id && optedIn) {
            await savePlayerIdToBackend(id);
          }
        });

        await OneSignal.init({
          appId,
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
          // Isolate OneSignal's worker in its own scope so it never conflicts
          // with our PWA caching worker (/sw.js at scope "/").
          serviceWorkerPath: "push/onesignal/OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/push/onesignal/" },
        });

        // Associate this device with our stable backend user id (external_id).
        await OneSignal.login(externalId);
        console.log("[OneSignal] Logged in with external_id:", externalId);

        // CRITICAL: explicitly opt the subscription in. This both requests
        // browser permission (if needed) AND enables the push subscription,
        // setting notification_types so OneSignal will actually deliver.
        const alreadyOptedIn: boolean = OneSignal.User?.PushSubscription?.optedIn ?? false;
        if (!alreadyOptedIn) {
          console.log("[OneSignal] Not opted in — calling optIn()");
          await OneSignal.User.PushSubscription.optIn();
        }

        // Save the resolved subscription id (fallback targeting path).
        const id: string | null = OneSignal.User?.PushSubscription?.id ?? null;
        const optedIn: boolean = OneSignal.User?.PushSubscription?.optedIn ?? false;
        console.log("[OneSignal] Post-optIn → id:", id, "optedIn:", optedIn);
        if (id && optedIn) {
          await savePlayerIdToBackend(id);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[OneSignal] Init error: ${msg}`);
      }
    });
  }, [isAuthenticated, user?.id]);
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
