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
 * Requests notification permission, retrieves the subscription player ID,
 * and saves it to the backend so the server can send push notifications.
 */
export function useOneSignal(): void {
  const { isAuthenticated } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || initialized.current) return;

    const appId = (import.meta as any).env?.VITE_ONESIGNAL_APP_ID as string | undefined;
    if (!appId) {
      console.warn("[OneSignal] VITE_ONESIGNAL_APP_ID not set — push notifications disabled");
      return;
    }

    initialized.current = true;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId,
          // Allow localhost during development (HTTPS is required in production)
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
          serviceWorkerParam: { scope: "/" },
        });

        // Request permission and get initial subscription ID
        const subscriptionId: string | null = OneSignal.User?.PushSubscription?.id ?? null;
        if (subscriptionId) {
          await savePlayerIdToBackend(subscriptionId);
        }

        // Listen for future subscription changes (e.g., user grants permission after init)
        OneSignal.User?.PushSubscription?.addEventListener(
          "change",
          async (event: any) => {
            const newId: string | null = event?.current?.id ?? null;
            if (newId) {
              await savePlayerIdToBackend(newId);
            }
          }
        );
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
    console.log(`[OneSignal] Player ID saved: ${playerId}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[OneSignal] Failed to save player ID: ${msg}`);
  }
}
