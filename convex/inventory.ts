import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    tribeId: v.string(),
    asset: v.string(),
    quantity: v.number(),
    notes: v.string(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("inventory")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("asset"), args.asset))
      .first();

    if (existing) {
      if (args.updatedAt >= existing.updatedAt) {
        await ctx.db.patch(existing._id, {
          quantity: args.quantity,
          notes: args.notes,
          updatedAt: args.updatedAt,
          updatedBy: args.updatedBy,
        });
      }
    } else {
      await ctx.db.insert("inventory", args);
    }
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});

export const get = query({
  args: {
    tribeId: v.string(),
    asset: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("asset"), args.asset))
      .first();
  },
});
