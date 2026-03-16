import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    docId: v.string(),
    tribeId: v.string(),
    title: v.string(),
    category: v.string(),
    status: v.string(),
    content: v.string(),
    version: v.number(),
    authorPub: v.string(),
    approvedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
    linkedRoles: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tribe_docs")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("docId"), args.docId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        category: args.category,
        status: args.status,
        content: args.content,
        version: args.version,
        approvedBy: args.approvedBy,
        updatedAt: args.updatedAt,
        approvedAt: args.approvedAt,
        linkedRoles: args.linkedRoles,
        tags: args.tags,
      });
    } else {
      await ctx.db.insert("tribe_docs", { ...args });
    }
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tribe_docs")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
