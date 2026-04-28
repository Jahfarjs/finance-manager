import mongoose, { Schema } from "mongoose";
import type { DailyExpense } from "@shared/schema";

const expenseItemSchema = new Schema(
  {
    purpose: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["expense", "earning"], default: "expense" },
  },
  { _id: true }
);

const expenseDaySchema = new Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    items: { type: [expenseItemSchema], required: true, default: [] },
    dayTotal: { type: Number, required: true, default: 0 },
    dayEarnings: { type: Number, default: 0 },
  },
  { _id: false }
);

const dailyExpenseSchema = new Schema<DailyExpense>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    month: { type: String, required: true, index: true }, // YYYY-MM format
    salaryCredited: { type: Number, default: 0 },
    days: { type: [expenseDaySchema], required: true, default: [] },
    monthlyTotal: { type: Number, required: true, default: 0 },
    monthlyEarnings: { type: Number, default: 0 },
    balance: { type: Number, required: true, default: 0 },
    balanceSBI: { type: Number, default: 0 },
    balanceKGB: { type: Number, default: 0 },
    balanceCash: { type: Number, default: 0 },
  },
  { versionKey: false }
);

// Create compound unique index to ensure one month per user
dailyExpenseSchema.index({ userId: 1, month: 1 }, { unique: true });

// Pre-save hook to recalculate totals
dailyExpenseSchema.pre("save", async function () {
  this.days.forEach((day) => {
    day.dayTotal = day.items
      .filter((item) => item.type !== "earning")
      .reduce((sum, item) => sum + item.amount, 0);

    day.dayEarnings = day.items
      .filter((item) => item.type === "earning")
      .reduce((sum, item) => sum + item.amount, 0);
  });

  this.monthlyTotal = this.days.reduce((sum, day) => sum + day.dayTotal, 0);
  this.monthlyEarnings = this.days.reduce((sum, day) => sum + (day.dayEarnings ?? 0), 0);
  this.balance = this.salaryCredited + this.monthlyEarnings - this.monthlyTotal;
});

export const DailyExpenseModel = mongoose.model<DailyExpense>("DailyExpense", dailyExpenseSchema);
