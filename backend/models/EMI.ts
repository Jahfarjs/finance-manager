import mongoose, { Schema } from "mongoose";
import type { EMI } from "@shared/schema";

const emiScheduleItemSchema = new Schema(
  {
    date: { type: String, required: true },
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
    paymentFrequency: { type: String, enum: ["monthly", "weekly", "twice_monthly", "custom"], default: "monthly" },
    customIntervalDays: { type: Number },
    emiAmountPerMonth: { type: Number, required: true },
    emiDuration: { type: Number, required: true },
    emiSchedule: { type: [emiScheduleItemSchema], required: true },
    remainingAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    isKuri: { type: Boolean, default: false },
    kuriReceivedAmount: { type: Number, default: 0 },
    kuriReceivedDate: { type: String },
  },
  { versionKey: false }
);

export const EMIModel = mongoose.model<EMI>("EMI", emiSchema);
