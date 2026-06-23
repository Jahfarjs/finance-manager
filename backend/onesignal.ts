const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

interface PushPayload {
  playerIds: string[];
  title: string;
  message: string;
  url?: string;
}

/**
 * Sends a web push via the OneSignal REST API.
 * @returns true if OneSignal accepted the notification with ≥1 recipient,
 *          false otherwise (missing config, API error, or 0 recipients).
 *          The caller should only mark a reminder as sent when this is true.
 */
export async function sendPushNotification({
  playerIds,
  title,
  message,
  url = "/reminders",
}: PushPayload): Promise<boolean> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    console.error(
      "[OneSignal] ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY not set in this environment — cannot send push. " +
        "Set them in your production env (e.g. Render dashboard)."
    );
    return false;
  }

  if (playerIds.length === 0) return false;

  const body = {
    app_id: appId,
    // SDK v16 uses subscription IDs — target_channel tells OneSignal this is a push subscription
    include_subscription_ids: playerIds,
    target_channel: "push",
    headings: { en: title },
    contents: { en: message },
    url,
    chrome_web_icon: "/logo.png",
    firefox_icon: "/logo.png",
  };

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const result: any = await response.json().catch(() => ({}));

    if (!response.ok || (Array.isArray(result.errors) && result.errors.length > 0)) {
      console.error(
        `[OneSignal] Push failed (${response.status}): ${JSON.stringify(result.errors ?? result)}`
      );
      return false;
    }

    const recipients = result.recipients ?? 0;
    console.log(`[OneSignal] Push accepted → id: ${result.id}, recipients: ${recipients}`);
    return recipients > 0;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[OneSignal] Network error: ${msg}`);
    return false;
  }
}
