import mongoose, { Schema } from "mongoose";
import type { Wishlist } from "@shared/schema";

const wishlistSchema = new Schema<Wishlist>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    wish: { type: String, required: true },
    category: { type: String, enum: ["Food", "Travel", "Entertainment", "Other"], required: true },
    status: { type: String, enum: ["pending", "completed"], required: true },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

export const WishlistModel = mongoose.model<Wishlist>("Wishlist", wishlistSchema);

