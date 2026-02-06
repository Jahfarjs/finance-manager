import mongoose, { Schema } from "mongoose";
import type { PersonalMemory } from "@shared/schema";

const personalMemorySchema = new Schema<PersonalMemory>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    title: { type: String, required: false },
    description: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

export const PersonalMemoryModel = mongoose.model<PersonalMemory>("PersonalMemory", personalMemorySchema);

