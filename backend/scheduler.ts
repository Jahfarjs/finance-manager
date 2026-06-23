import { storage } from "./storage";
import { sendPushNotification } from "./onesignal";

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
let schedulerStarted = false;

export function startReminderScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Run once immediately on startup, then every 60 seconds
  void processReminderPushNotifications();
  setInterval(() => void processReminderPushNotifications(), POLL_INTERVAL_MS);

  console.log(`[scheduler] Started — polling every ${POLL_INTERVAL_MS / 1000}s`);
}

async function processReminderPushNotifications(): Promise<void> {
  try {
    const now = new Date().toISOString();
    const dueReminders = await storage.getDueRemindersForPush(now);

    if (dueReminders.length === 0) return;

    console.log(`[scheduler] ${dueReminders.length} reminder(s) due at ${now}`);

    for (const reminder of dueReminders) {
      console.log(`[scheduler] Processing reminder "${reminder.title}" (id: ${reminder.id}, remindAt: ${reminder.remindAt})`);

      const user = await storage.getUser(reminder.userId);

      if (!user) {
        console.warn(`[scheduler] User ${reminder.userId} not found — marking pushSent to skip`);
        await storage.markReminderPushSent(reminder.id);
        continue;
      }

      if (!user.oneSignalPlayerId) {
        // User has not granted push permission yet — do NOT mark pushSent,
        // so we retry next cycle in case they subscribe before the event.
        console.log(`[scheduler] User ${reminder.userId} has no push subscription — will retry next cycle`);
        continue;
      }

      const title = `⏰ Reminder: ${reminder.title}`;
      const body = reminder.description
        ? reminder.description
        : `Your event is on ${reminder.eventDate}${reminder.eventTime ? ` at ${reminder.eventTime}` : ""}`;

      console.log(`[scheduler] Sending push to subscription ${user.oneSignalPlayerId} — "${title}"`);

      const sent = await sendPushNotification({
        playerIds: [user.oneSignalPlayerId],
        title,
        message: body,
        url: "/reminders",
      });

      if (sent) {
        // Mark as sent ONLY after OneSignal confirms ≥1 recipient.
        // If it failed (missing env, API error, 0 recipients), we leave
        // pushSent untouched so it retries on the next cycle.
        await storage.markReminderPushSent(reminder.id);
        console.log(`[scheduler] ✓ Push sent + marked for reminder "${reminder.title}"`);
      } else {
        console.warn(`[scheduler] ✗ Push NOT sent for "${reminder.title}" — will retry next cycle`);
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[scheduler] Error: ${msg}`);
  }
}
