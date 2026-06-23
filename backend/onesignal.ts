const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

interface PushPayload {
  /** Stable external user id (our backend userId). Preferred targeting. */
  externalId?: string;
  /** OneSignal subscription ids. Fallback targeting. */
  playerIds?: string[];
  title: string;
  message: string;
  url?: string;
}

/**
 * Sends a web push via the OneSignal REST API.
 *
 * Targeting strategy:
 *   Prefer external_id (stable — set via OneSignal.login(userId) on the client)
 *   so we are immune to subscription-id churn. Falls back to subscription ids.
 *
 * @returns true only if OneSignal accepted the notification with ≥1 recipient.
 *          The caller must only mark a reminder sent when this is true, so
 *          transient failures retry on the next cycle.
 */
export async function sendPushNotification({
  externalId,
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

  const body: Record<string, unknown> = {
    app_id: appId,
    target_channel: "push",
    headings: { en: title },
    contents: { en: message },
    url,
    chrome_web_icon: "/logo.png",
    firefox_icon: "/logo.png",
  };

  if (externalId) {
    body.include_aliases = { external_id: [externalId] };
  } else if (playerIds && playerIds.length > 0) {
    body.include_subscription_ids = playerIds;
  } else {
    console.error("[OneSignal] No targeting (externalId/playerIds) provided — skipping");
    return false;
  }

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
