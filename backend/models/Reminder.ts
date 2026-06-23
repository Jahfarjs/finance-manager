import mongoose from "mongoose";
import type { Reminder } from "@shared/schema";

const reminderMongooseSchema = new mongoose.Schema<Reminder>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    eventDate: { type: String, required: true },
    eventTime: { type: String },
    remindAt: { type: String, required: true },
    status: { type: String, enum: ["pending", "dismissed"], default: "pending" },
    pushSent: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
  },
  { collection: "reminders", versionKey: false }
);

export const ReminderModel = mongoose.model<Reminder>("Reminder", reminderMongooseSchema);
