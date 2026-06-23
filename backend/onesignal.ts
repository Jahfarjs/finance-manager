const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

interface PushPayload {
  playerIds: string[];
  title: string;
  message: string;
  url?: string;
}

export async function sendPushNotification({
  playerIds,
  title,
  message,
  url = "/reminders",
}: PushPayload): Promise<void> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    console.warn("[OneSignal] ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not set — skipping push");
    return;
  }

  if (playerIds.length === 0) return;

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
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OneSignal] Push failed (${response.status}): ${errorText}`);
    } else {
      const result = await response.json();
      console.log(`[OneSignal] Push sent → recipients: ${result.recipients ?? 0}, id: ${result.id}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[OneSignal] Network error: ${msg}`);
  }
}
