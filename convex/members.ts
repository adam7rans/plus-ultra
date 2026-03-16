import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    tribeId: v.string(),
    pubkey: v.string(),
    joinedAt: v.number(),
    lastSeen: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("away_declared"),
      v.literal("away_undeclared"),
      v.literal("departed"),
    ),
    attachmentScore: v.number(),
    declaredReturnAt: v.optional(v.number()),
    memberType: v.union(
      v.literal("adult"),
      v.literal("dependent"),
      v.literal("child"),
      v.literal("elder"),
    ),
    authorityRole: v.optional(
      v.union(
        v.literal("founder"),
        v.literal("elder_council"),
        v.literal("lead"),
        v.literal("member"),
        v.literal("restricted"),
      ),
    ),
    role: v.optional(v.string()),
    displayName: v.string(),
    epub: v.optional(v.string()),
    isDiplomat: v.optional(v.boolean()),
    bio: v.optional(v.string()),
    availability: v.optional(
      v.union(
        v.literal("full_time"),
        v.literal("part_time"),
        v.literal("on_call"),
      ),
    ),
    physicalLimitations: v.optional(v.string()),
    bloodType: v.optional(
      v.union(
        v.literal("A+"),
        v.literal("A-"),
        v.literal("B+"),
        v.literal("B-"),
        v.literal("AB+"),
        v.literal("AB-"),
        v.literal("O+"),
        v.literal("O-"),
        v.literal("unknown"),
      ),
    ),
    allergies: v.optional(v.array(v.string())),
    medications: v.optional(v.array(v.string())),
    medicalConditions: v.optional(v.array(v.string())),
    currentHealthStatus: v.optional(
      v.union(
        v.literal("well"),
        v.literal("minor_injury"),
        v.literal("major_injury"),
        v.literal("critical"),
        v.literal("deceased"),
      ),
    ),
    healthStatusUpdatedAt: v.optional(v.number()),
    healthStatusUpdatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribe_members")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("pubkey"), args.pubkey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
    } else {
      await ctx.db.insert("tribe_members", { ...args });
    }
  },
});

export const get = query({
  args: {
    tribeId: v.string(),
    pubkey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tribe_members")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("pubkey"), args.pubkey))
      .first();
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tribe_members")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});

export const updateProfile = mutation({
  args: {
    tribeId: v.string(),
    pubkey: v.string(),
    bio: v.optional(v.string()),
    availability: v.optional(
      v.union(
        v.literal("full_time"),
        v.literal("part_time"),
        v.literal("on_call"),
      ),
    ),
    physicalLimitations: v.optional(v.string()),
    memberType: v.optional(
      v.union(
        v.literal("adult"),
        v.literal("dependent"),
        v.literal("child"),
        v.literal("elder"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribe_members")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("pubkey"), args.pubkey))
      .first();

    if (!existing) return;

    const { tribeId: _, pubkey: __, ...updates } = args;
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

export const setAuthorityRole = mutation({
  args: {
    tribeId: v.string(),
    pubkey: v.string(),
    authorityRole: v.union(
      v.literal("founder"),
      v.literal("elder_council"),
      v.literal("lead"),
      v.literal("member"),
      v.literal("restricted"),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribe_members")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("pubkey"), args.pubkey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { authorityRole: args.authorityRole });
    }
  },
});

export const setDiplomatStatus = mutation({
  args: {
    tribeId: v.string(),
    pubkey: v.string(),
    isDiplomat: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribe_members")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("pubkey"), args.pubkey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { isDiplomat: args.isDiplomat });
    }
  },
});

export const updateHealth = mutation({
  args: {
    tribeId: v.string(),
    pubkey: v.string(),
    bloodType: v.optional(
      v.union(
        v.literal("A+"),
        v.literal("A-"),
        v.literal("B+"),
        v.literal("B-"),
        v.literal("AB+"),
        v.literal("AB-"),
        v.literal("O+"),
        v.literal("O-"),
        v.literal("unknown"),
      ),
    ),
    allergies: v.optional(v.array(v.string())),
    medications: v.optional(v.array(v.string())),
    medicalConditions: v.optional(v.array(v.string())),
    currentHealthStatus: v.optional(
      v.union(
        v.literal("well"),
        v.literal("minor_injury"),
        v.literal("major_injury"),
        v.literal("critical"),
        v.literal("deceased"),
      ),
    ),
    healthStatusUpdatedAt: v.optional(v.number()),
    healthStatusUpdatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribe_members")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("pubkey"), args.pubkey))
      .first();

    if (!existing) return;

    const { tribeId: _, pubkey: __, ...updates } = args;
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

export const markDeparted = mutation({
  args: {
    tribeId: v.string(),
    pubkey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribe_members")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("pubkey"), args.pubkey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { status: "departed" });
    }
  },
});
