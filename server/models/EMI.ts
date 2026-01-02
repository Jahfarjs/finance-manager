import mongoose, { Schema } from "mongoose";
import type { EMI } from "@shared/schema";

const emiScheduleItemSchema = new Schema(
  {
    month: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["paid", "unpaid"], required: true },
  },
  { _id: false }
);

const emiSchema = new Schema<EMI>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    emiTitle: { type: String, required: true },
    startMonth: { type: String, required: true },
    emiAmountPerMonth: { type: Number, required: true },
    emiDuration: { type: Number, required: true },
    emiSchedule: { type: [emiScheduleItemSchema], required: true },
    remainingAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
  },
  { versionKey: false }
);

export const EMIModel = mongoose.model<EMI>("EMI", emiSchema);

