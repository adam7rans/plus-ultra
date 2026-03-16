import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const log = mutation({
  args: {
    entryId: v.string(),
    tribeId: v.string(),
    assetType: v.string(),
    amount: v.number(),
    periodDays: v.number(),
    loggedAt: v.number(),
    loggedBy: v.string(),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("production_log", { ...args });
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("production_log")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
