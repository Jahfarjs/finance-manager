import mongoose, { Schema } from "mongoose";
import type { User } from "@shared/schema";

const userSchema = new Schema<User>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

export const UserModel = mongoose.model<User>("User", userSchema);

