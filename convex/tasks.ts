import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    taskId: v.string(),
    tribeId: v.string(),
    goalId: v.optional(v.string()),
    milestoneId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("blocked"), v.literal("done")),
    priority: v.union(v.literal("critical"), v.literal("high"), v.literal("normal"), v.literal("low")),
    assignedTo: v.array(v.string()),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribe_tasks")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("taskId"), args.taskId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        goalId: args.goalId,
        milestoneId: args.milestoneId,
        title: args.title,
        description: args.description,
        status: args.status,
        priority: args.priority,
        assignedTo: args.assignedTo,
        dueDate: args.dueDate,
        completedAt: args.completedAt,
        updatedAt: args.updatedAt,
      });
    } else {
      await ctx.db.insert("tribe_tasks", { ...args });
    }
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tribe_tasks")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
