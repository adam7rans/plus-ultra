import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    planId: v.string(),
    tribeId: v.string(),
    name: v.string(),
    status: v.union(v.literal("draft"), v.literal("ready"), v.literal("active")),
    triggerCondition: v.string(),
    routeId: v.optional(v.string()),
    vehicles: v.any(),
    loadPriorities: v.any(),
    rallyPointIds: v.any(),
    notes: v.optional(v.string()),
    activatedAt: v.optional(v.number()),
    activatedBy: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bugout_plans")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("planId"), args.planId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        status: args.status,
        triggerCondition: args.triggerCondition,
        routeId: args.routeId,
        vehicles: args.vehicles,
        loadPriorities: args.loadPriorities,
        rallyPointIds: args.rallyPointIds,
        notes: args.notes,
        activatedAt: args.activatedAt,
        activatedBy: args.activatedBy,
        updatedAt: args.updatedAt,
      });
    } else {
      await ctx.db.insert("bugout_plans", { ...args });
    }
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bugout_plans")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
