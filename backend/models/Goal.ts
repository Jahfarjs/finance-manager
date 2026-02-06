import mongoose, { Schema } from "mongoose";
import type { Goal } from "@shared/schema";

const goalSchema = new Schema<Goal>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    goalName: { type: String, required: true },
    status: { type: String, enum: ["pending", "completed"], required: true },
  },
  { versionKey: false }
);

export const GoalModel = mongoose.model<Goal>("Goal", goalSchema);

