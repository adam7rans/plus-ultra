import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    contactId: v.string(),
    tribeId: v.string(),
    name: v.string(),
    category: v.string(),
    role: v.optional(v.string()),
    phone: v.optional(v.string()),
    radioFreq: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    addedBy: v.string(),
    addedAt: v.number(),
    lastVerified: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("external_contacts")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("contactId"), args.contactId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        category: args.category,
        role: args.role,
        phone: args.phone,
        radioFreq: args.radioFreq,
        lat: args.lat,
        lng: args.lng,
        location: args.location,
        notes: args.notes,
        lastVerified: args.lastVerified,
      });
    } else {
      await ctx.db.insert("external_contacts", { ...args });
    }
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("external_contacts")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
