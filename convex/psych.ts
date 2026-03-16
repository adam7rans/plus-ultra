import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertProfile = mutation({
  args: {
    memberId: v.string(),
    tribeId: v.string(),
    archetype: v.string(),
    dimensions: v.any(),
    quizCompletedAt: v.optional(v.number()),
    lastUpdatedAt: v.number(),
    peerDimensions: v.any(),
    peerRatingCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("psych_profiles")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("memberId"), args.memberId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        archetype: args.archetype,
        dimensions: args.dimensions,
        quizCompletedAt: args.quizCompletedAt,
        lastUpdatedAt: args.lastUpdatedAt,
        peerDimensions: args.peerDimensions,
        peerRatingCount: args.peerRatingCount,
      });
    } else {
      await ctx.db.insert("psych_profiles", { ...args });
    }
  },
});

export const submitRating = mutation({
  args: {
    ratingId: v.string(),
    tribeId: v.string(),
    ratedPub: v.string(),
    stressTolerance: v.number(),
    leadershipStyle: v.number(),
    conflictApproach: v.number(),
    ratedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("peer_ratings")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("ratingId"), args.ratingId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ratedPub: args.ratedPub,
        stressTolerance: args.stressTolerance,
        leadershipStyle: args.leadershipStyle,
        conflictApproach: args.conflictApproach,
        ratedAt: args.ratedAt,
      });
    } else {
      await ctx.db.insert("peer_ratings", { ...args });
    }
  },
});

export const listProfiles = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("psych_profiles")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});

export const listRatings = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("peer_ratings")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
