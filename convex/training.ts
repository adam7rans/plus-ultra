import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const logSession = mutation({
  args: {
    sessionId: v.string(),
    tribeId: v.string(),
    title: v.string(),
    skillRole: v.optional(v.string()),
    date: v.number(),
    durationMinutes: v.number(),
    trainerId: v.string(),
    attendees: v.array(v.string()),
    notes: v.string(),
    loggedBy: v.string(),
    loggedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("training_sessions", { ...args });
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("training_sessions")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});

export const upsertCertification = mutation({
  args: {
    certId: v.string(),
    tribeId: v.string(),
    memberId: v.string(),
    certName: v.string(),
    issuingBody: v.string(),
    licenseNumber: v.string(),
    issuedAt: v.number(),
    expiresAt: v.number(),
    linkedRole: v.optional(v.string()),
    verifiedBy: v.string(),
    verifiedAt: v.number(),
    addedBy: v.string(),
    addedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("certifications")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("certId"), args.certId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        certName: args.certName,
        issuingBody: args.issuingBody,
        licenseNumber: args.licenseNumber,
        issuedAt: args.issuedAt,
        expiresAt: args.expiresAt,
        linkedRole: args.linkedRole,
        verifiedBy: args.verifiedBy,
        verifiedAt: args.verifiedAt,
      });
    } else {
      await ctx.db.insert("certifications", { ...args });
    }
  },
});

export const listCertifications = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("certifications")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
