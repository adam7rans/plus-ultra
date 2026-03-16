import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertPacePlan = mutation({
  args: {
    tribeId: v.string(),
    methods: v.any(),
    checkInSchedules: v.any(),
    rallyPoints: v.any(),
    codeWords: v.optional(v.any()),
    lastUpdatedAt: v.number(),
    lastUpdatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pace_plan")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        methods: args.methods,
        checkInSchedules: args.checkInSchedules,
        rallyPoints: args.rallyPoints,
        codeWords: args.codeWords,
        lastUpdatedAt: args.lastUpdatedAt,
        lastUpdatedBy: args.lastUpdatedBy,
      });
    } else {
      await ctx.db.insert("pace_plan", { ...args });
    }
  },
});

export const getPacePlan = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pace_plan")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .first();
  },
});
