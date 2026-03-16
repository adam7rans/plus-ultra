import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertGoal = mutation({
  args: {
    goalId: v.string(),
    tribeId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    horizon: v.union(v.literal("immediate"), v.literal("short_term"), v.literal("long_term")),
    status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("paused"), v.literal("completed")),
    linkedProposalId: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribe_goals")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("goalId"), args.goalId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        horizon: args.horizon,
        status: args.status,
        linkedProposalId: args.linkedProposalId,
        updatedAt: args.updatedAt,
      });
    } else {
      await ctx.db.insert("tribe_goals", { ...args });
    }
  },
});

export const upsertMilestone = mutation({
  args: {
    milestoneId: v.string(),
    goalId: v.string(),
    tribeId: v.string(),
    title: v.string(),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("goal_milestones")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("milestoneId"), args.milestoneId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        goalId: args.goalId,
        title: args.title,
        dueDate: args.dueDate,
        completedAt: args.completedAt,
      });
    } else {
      await ctx.db.insert("goal_milestones", { ...args });
    }
  },
});

export const listGoals = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tribe_goals")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});

export const listMilestones = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("goal_milestones")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
