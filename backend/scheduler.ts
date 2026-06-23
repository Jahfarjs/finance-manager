import { storage } from "./storage";
import { sendPushNotification } from "./onesignal";

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
let schedulerStarted = false;

export function startReminderScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Run immediately on startup, then every 60 seconds
  void processReminderPushNotifications();
  setInterval(() => void processReminderPushNotifications(), POLL_INTERVAL_MS);

  console.log(`[scheduler] Reminder push scheduler started — polling every ${POLL_INTERVAL_MS / 1000}s`);
}

async function processReminderPushNotifications(): Promise<void> {
  try {
    const now = new Date().toISOString();
    const dueReminders = await storage.getDueRemindersForPush(now);

    if (dueReminders.length === 0) return;

    console.log(`[scheduler] Found ${dueReminders.length} reminder(s) due for push`);

    for (const reminder of dueReminders) {
      // Always mark pushSent first to prevent duplicate sends on retry
      await storage.markReminderPushSent(reminder.id);

      const user = await storage.getUser(reminder.userId);
      if (!user?.oneSignalPlayerId) {
        console.log(`[scheduler] No push subscription for user ${reminder.userId} — skipping push for "${reminder.title}"`);
        continue;
      }

      const title = `⏰ Reminder: ${reminder.title}`;
      const body = reminder.description
        ? reminder.description
        : `Your event is on ${reminder.eventDate}${reminder.eventTime ? ` at ${reminder.eventTime}` : ""}`;

      await sendPushNotification({
        playerIds: [user.oneSignalPlayerId],
        title,
        message: body,
        url: "/reminders",
      });

      console.log(`[scheduler] Push dispatched for reminder "${reminder.title}" → user ${reminder.userId}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[scheduler] Error processing reminders: ${msg}`);
  }
}
