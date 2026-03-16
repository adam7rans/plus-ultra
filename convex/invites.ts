import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    token: v.string(),
    tribeId: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("invite_tokens", {
      token: args.token,
      tribeId: args.tribeId,
      expiresAt: args.expiresAt,
      createdAt: args.createdAt,
      used: false,
    });
  },
});

export const validate = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invite_tokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) {
      return { valid: false, reason: "Invite not found" };
    }

    if (invite.used) {
      return { valid: false, reason: "Invite already used" };
    }

    if (invite.expiresAt < Date.now()) {
      return { valid: false, reason: "Invite expired" };
    }

    return { valid: true };
  },
});

export const consume = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invite_tokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (invite) {
      await ctx.db.patch(invite._id, { used: true });
    }
  },
});
