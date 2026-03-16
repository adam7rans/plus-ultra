import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const send = mutation({
  args: {
    msgId: v.string(),
    tribeId: v.string(),
    channelId: v.string(),
    senderId: v.string(),
    type: v.union(v.literal("text"), v.literal("voice"), v.literal("photo")),
    content: v.string(),
    mimeType: v.optional(v.string()),
    sentAt: v.number(),
    sig: v.string(),
    replyTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", args);
  },
});

export const listByChannel = query({
  args: { channelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("asc")
      .collect();
  },
});

export const addReaction = mutation({
  args: {
    msgId: v.string(),
    tribeId: v.string(),
    emoji: v.string(),
    pubkey: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("msgId"), args.msgId))
      .first();
    if (!message) throw new Error("Message not found");

    const reactions: Record<string, string[]> = (message as any).reactions ?? {};
    const list = reactions[args.emoji] ?? [];
    if (!list.includes(args.pubkey)) {
      list.push(args.pubkey);
    }
    reactions[args.emoji] = list;

    await ctx.db.patch(message._id, { reactions });
  },
});
