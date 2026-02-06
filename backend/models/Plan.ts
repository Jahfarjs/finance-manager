import mongoose, { Schema } from "mongoose";
import type { Plan } from "@shared/schema";

const planSchema = new Schema<Plan>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    planDescription: { type: String, required: true },
    date: { type: String, required: false },
    status: { type: String, enum: ["worked", "not_worked"], required: true },
  },
  { versionKey: false }
);

export const PlanModel = mongoose.model<Plan>("Plan", planSchema);

