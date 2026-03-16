import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createMuster = mutation({
  args: {
    musterId: v.string(),
    tribeId: v.string(),
    initiatedBy: v.string(),
    initiatedByName: v.string(),
    initiatedAt: v.number(),
    reason: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("muster_calls", { ...args, status: "active" });
  },
});

export const closeMuster = mutation({
  args: { musterId: v.string(), tribeId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("muster_calls")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("musterId"), args.musterId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "closed",
        closedAt: Date.now(),
      });
    }
  },
});

export const respond = mutation({
  args: {
    musterId: v.string(),
    memberPub: v.string(),
    memberName: v.string(),
    status: v.string(),
    respondedAt: v.number(),
    respondedByPub: v.string(),
    location: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("muster_responses")
      .withIndex("by_muster", (q) => q.eq("musterId", args.musterId))
      .filter((q) => q.eq(q.field("memberPub"), args.memberPub))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        memberName: args.memberName,
        status: args.status,
        respondedAt: args.respondedAt,
        respondedByPub: args.respondedByPub,
        location: args.location,
        note: args.note,
      });
    } else {
      await ctx.db.insert("muster_responses", { ...args });
    }
  },
});

export const getMuster = query({
  args: { musterId: v.string(), tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("muster_calls")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("musterId"), args.musterId))
      .first();
  },
});

export const listResponses = query({
  args: { musterId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("muster_responses")
      .withIndex("by_muster", (q) => q.eq("musterId", args.musterId))
      .collect();
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("muster_calls")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
