import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    tribeId: v.string(),
    mode: v.union(v.literal("up"), v.literal("down")),
    isSimulation: v.boolean(),
    setBy: v.string(),
    setByName: v.string(),
    setAt: v.number(),
    expiresAt: v.number(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("grid_state")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        mode: args.mode,
        isSimulation: args.isSimulation,
        setBy: args.setBy,
        setByName: args.setByName,
        setAt: args.setAt,
        expiresAt: args.expiresAt,
        message: args.message,
      });
    } else {
      await ctx.db.insert("grid_state", { ...args });
    }
  },
});

export const get = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("grid_state")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .first();
  },
});

export const upsertInfraStatus = mutation({
  args: {
    memberPub: v.string(),
    tribeId: v.string(),
    failingItems: v.array(v.string()),
    updatedAt: v.number(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("member_infra_status")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("memberPub"), args.memberPub))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        failingItems: args.failingItems,
        updatedAt: args.updatedAt,
        displayName: args.displayName,
      });
    } else {
      await ctx.db.insert("member_infra_status", { ...args });
    }
  },
});

export const listInfraStatus = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("member_infra_status")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
