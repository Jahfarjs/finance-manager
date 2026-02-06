import mongoose, { Schema } from "mongoose";
import type { Finance } from "@shared/schema";

const financeEntrySchema = new Schema(
  {
    person: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const financeSchema = new Schema<Finance>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, unique: true, index: true },
    debitList: { type: [financeEntrySchema], default: [] },
    creditList: { type: [financeEntrySchema], default: [] },
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
  },
  { versionKey: false }
);

export const FinanceModel = mongoose.model<Finance>("Finance", financeSchema);

