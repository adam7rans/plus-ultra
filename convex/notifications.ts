import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    notifId: v.string(),
    tribeId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    createdAt: v.number(),
    targetPub: v.string(),
    actorPub: v.optional(v.string()),
    linkTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", { ...args, read: false });
  },
});

export const listByTribeAndTarget = query({
  args: { tribeId: v.string(), targetPub: v.string() },
  handler: async (ctx, args) => {
    const direct = await ctx.db
      .query("notifications")
      .withIndex("by_tribe_target", (q) =>
        q.eq("tribeId", args.tribeId).eq("targetPub", args.targetPub)
      )
      .order("desc")
      .take(100);
    const broadcast = await ctx.db
      .query("notifications")
      .withIndex("by_tribe_target", (q) =>
        q.eq("tribeId", args.tribeId).eq("targetPub", "*")
      )
      .order("desc")
      .take(100);
    const combined = [...direct, ...broadcast];
    combined.sort((a, b) => b.createdAt - a.createdAt);
    return combined.slice(0, 100);
  },
});

export const markRead = mutation({
  args: { notifId: v.string(), tribeId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_tribe_target", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("notifId"), args.notifId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { read: true });
    }
  },
});

export const markAllRead = mutation({
  args: { tribeId: v.string(), memberPub: v.string() },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_tribe_target", (q) =>
        q.eq("tribeId", args.tribeId).eq("targetPub", args.memberPub)
      )
      .filter((q) => q.eq(q.field("read"), false))
      .collect();
    for (const notif of unread) {
      await ctx.db.patch(notif._id, { read: true });
    }
  },
});
