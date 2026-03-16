import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const declare = mutation({
  args: {
    memberId: v.string(),
    tribeId: v.string(),
    role: v.string(),
    proficiency: v.union(v.literal("basic"), v.literal("intermediate"), v.literal("expert"), v.literal("verified_expert")),
    declaredAt: v.number(),
    vouchedBy: v.array(v.string()),
    specializations: v.optional(v.array(v.string())),
    yearsExperience: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) =>
        q.and(
          q.eq(q.field("memberId"), args.memberId),
          q.eq(q.field("role"), args.role)
        )
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("skills", args);
    }
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skills")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});

export const listByMember = query({
  args: {
    tribeId: v.string(),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skills")
      .withIndex("by_member", (q) =>
        q.eq("tribeId", args.tribeId).eq("memberId", args.memberId)
      )
      .collect();
  },
});

export const vouch = mutation({
  args: {
    tribeId: v.string(),
    memberId: v.string(),
    role: v.string(),
    voucherPub: v.string(),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db
      .query("skills")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) =>
        q.and(
          q.eq(q.field("memberId"), args.memberId),
          q.eq(q.field("role"), args.role)
        )
      )
      .first();
    if (!skill) throw new Error("Skill not found");

    const vouchedBy = skill.vouchedBy as string[];
    if (!vouchedBy.includes(args.voucherPub)) {
      vouchedBy.push(args.voucherPub);
      await ctx.db.patch(skill._id, { vouchedBy });
    }
  },
});
