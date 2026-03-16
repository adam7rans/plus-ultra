import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    id: v.string(),
    pub: v.string(),
    epub: v.optional(v.string()),
    name: v.string(),
    location: v.string(),
    region: v.string(),
    createdAt: v.number(),
    constitutionTemplate: v.union(
      v.literal("direct_democracy"),
      v.literal("council"),
      v.literal("hybrid"),
    ),
    founderId: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribes")
      .withIndex("by_tribe_id", (q) => q.eq("id", args.id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
    } else {
      await ctx.db.insert("tribes", { ...args });
    }
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tribes")
      .withIndex("by_tribe_id", (q) => q.eq("id", args.id))
      .first();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tribes").collect();
  },
});

export const markDeleted = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribes")
      .withIndex("by_tribe_id", (q) => q.eq("id", args.id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        deleted: true,
        deletedAt: Date.now(),
      });
    }
  },
});

export const updateMeta = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    region: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribes")
      .withIndex("by_tribe_id", (q) => q.eq("id", args.id))
      .first();

    if (!existing) return;

    const { id: _, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
    }
  },
});
