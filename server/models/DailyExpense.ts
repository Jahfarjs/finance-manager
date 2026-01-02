import mongoose, { Schema } from "mongoose";
import type { DailyExpense } from "@shared/schema";

const expenseItemSchema = new Schema(
  {
    purpose: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const dailyExpenseSchema = new Schema<DailyExpense>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    expenses: { type: [expenseItemSchema], required: true },
    total: { type: Number, required: true },
    salaryCredited: { type: Number, default: 0 },
  },
  { versionKey: false }
);

export const DailyExpenseModel = mongoose.model<DailyExpense>("DailyExpense", dailyExpenseSchema);

