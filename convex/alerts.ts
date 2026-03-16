import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    alertId: v.string(),
    tribeId: v.string(),
    alertType: v.string(),
    message: v.string(),
    senderPub: v.string(),
    senderName: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("alerts", { ...args });
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("alerts")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .order("desc")
      .take(50);
  },
});
