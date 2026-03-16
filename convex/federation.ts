import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertRelationship = mutation({
  args: {
    channelId: v.string(),
    myTribeId: v.string(),
    otherTribeId: v.string(),
    otherTribeName: v.string(),
    otherTribeLocation: v.string(),
    otherTribePub: v.string(),
    otherTribeEpub: v.string(),
    status: v.union(v.literal("contact"), v.literal("allied"), v.literal("distrusted")),
    initiatedBy: v.string(),
    initiatedAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("federation_relationships")
      .withIndex("by_tribe", (q) => q.eq("myTribeId", args.myTribeId))
      .filter((q) => q.eq(q.field("channelId"), args.channelId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        otherTribeName: args.otherTribeName,
        otherTribeLocation: args.otherTribeLocation,
        otherTribePub: args.otherTribePub,
        otherTribeEpub: args.otherTribeEpub,
        status: args.status,
        updatedAt: args.updatedAt,
      });
    } else {
      await ctx.db.insert("federation_relationships", { ...args });
    }
  },
});

export const sendMessage = mutation({
  args: {
    messageId: v.string(),
    channelId: v.string(),
    fromTribeId: v.string(),
    fromTribeName: v.string(),
    senderPub: v.string(),
    senderName: v.string(),
    type: v.union(v.literal("text"), v.literal("intel")),
    content: v.string(),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("federation_messages", { ...args });
  },
});

export const proposeTrade = mutation({
  args: {
    tradeId: v.string(),
    channelId: v.string(),
    fromTribeId: v.string(),
    toTribeId: v.string(),
    fromTribeName: v.string(),
    toTribeName: v.string(),
    offer: v.any(),
    request: v.any(),
    message: v.string(),
    proposedBy: v.string(),
    proposedAt: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("federation_trades", { ...args });
  },
});

export const updateTradeStatus = mutation({
  args: {
    tradeId: v.string(),
    channelId: v.string(),
    status: v.string(),
    respondedAt: v.optional(v.number()),
    respondedBy: v.optional(v.string()),
    counterOffer: v.optional(v.any()),
    lastRespondedByTribeId: v.optional(v.string()),
    fromFulfilled: v.optional(v.boolean()),
    toFulfilled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("federation_trades")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("tradeId"), args.tradeId))
      .first();
    if (existing) {
      const updates: Record<string, unknown> = { status: args.status };
      if (args.respondedAt !== undefined) updates.respondedAt = args.respondedAt;
      if (args.respondedBy !== undefined) updates.respondedBy = args.respondedBy;
      if (args.counterOffer !== undefined) updates.counterOffer = args.counterOffer;
      if (args.lastRespondedByTribeId !== undefined) updates.lastRespondedByTribeId = args.lastRespondedByTribeId;
      if (args.fromFulfilled !== undefined) updates.fromFulfilled = args.fromFulfilled;
      if (args.toFulfilled !== undefined) updates.toFulfilled = args.toFulfilled;
      await ctx.db.patch(existing._id, updates);
    }
  },
});

export const listRelationships = query({
  args: { myTribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("federation_relationships")
      .withIndex("by_tribe", (q) => q.eq("myTribeId", args.myTribeId))
      .collect();
  },
});

export const listMessages = query({
  args: { channelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("federation_messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
  },
});

export const listTrades = query({
  args: { channelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("federation_trades")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
  },
});
