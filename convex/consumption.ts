import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const log = mutation({
  args: {
    entryId: v.string(),
    tribeId: v.string(),
    asset: v.string(),
    amount: v.number(),
    periodDays: v.number(),
    loggedAt: v.number(),
    loggedBy: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("consumption_log", { ...args });
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("consumption_log")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
