import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    eventId: v.string(),
    tribeId: v.string(),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    startAt: v.number(),
    durationMin: v.number(),
    recurrence: v.any(),
    createdBy: v.string(),
    createdAt: v.number(),
    assignedTo: v.array(v.string()),
    location: v.string(),
    cancelled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("events")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("eventId"), args.eventId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        type: args.type,
        title: args.title,
        description: args.description,
        startAt: args.startAt,
        durationMin: args.durationMin,
        recurrence: args.recurrence,
        assignedTo: args.assignedTo,
        location: args.location,
        cancelled: args.cancelled,
      });
    } else {
      await ctx.db.insert("events", { ...args });
    }
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});

export const cancel = mutation({
  args: { eventId: v.string(), tribeId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("events")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("eventId"), args.eventId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { cancelled: true });
    }
  },
});
