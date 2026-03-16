import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const subscribe = mutation({
  args: {
    tribeId: v.string(),
    memberPub: v.string(),
    subscription: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("push_subscriptions")
      .withIndex("by_tribe_member", (q) =>
        q.eq("tribeId", args.tribeId).eq("memberPub", args.memberPub)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { subscription: args.subscription });
    } else {
      await ctx.db.insert("push_subscriptions", { ...args });
    }
  },
});

export const unsubscribe = mutation({
  args: { tribeId: v.string(), memberPub: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("push_subscriptions")
      .withIndex("by_tribe_member", (q) =>
        q.eq("tribeId", args.tribeId).eq("memberPub", args.memberPub)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getSubscriptions = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("push_subscriptions")
      .withIndex("by_tribe_member", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
