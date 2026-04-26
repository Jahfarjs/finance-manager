import mongoose, { Schema } from "mongoose";
import type { DailyTask } from "@shared/schema";

const dailyTaskSchema = new Schema<DailyTask>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    taskName: { type: String, required: true },
    frequency: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
    startDate: { type: String, required: true },
    completions: { type: [String], default: [] },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

export const DailyTaskModel = mongoose.model<DailyTask>("DailyTask", dailyTaskSchema);
