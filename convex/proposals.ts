import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    proposalId: v.string(),
    tribeId: v.string(),
    title: v.string(),
    body: v.string(),
    scope: v.union(v.literal("operational"), v.literal("major")),
    createdBy: v.string(),
    createdAt: v.number(),
    closesAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("proposals", {
      ...args,
      status: "open",
      outcome: "none",
      closedAt: 0,
      closedBy: "",
    });
  },
});

export const listByTribe = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proposals")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});

export const get = query({
  args: { proposalId: v.string(), tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proposals")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("proposalId"), args.proposalId))
      .first();
  },
});

export const close = mutation({
  args: {
    proposalId: v.string(),
    tribeId: v.string(),
    outcome: v.union(
      v.literal("passed"),
      v.literal("failed"),
      v.literal("withdrawn")
    ),
    closedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("proposalId"), args.proposalId))
      .first();
    if (!proposal) throw new Error("Proposal not found");

    await ctx.db.patch(proposal._id, {
      status: "closed",
      outcome: args.outcome,
      closedAt: Date.now(),
      closedBy: args.closedBy,
    });
  },
});

export const castVote = mutation({
  args: {
    proposalId: v.string(),
    tribeId: v.string(),
    memberPub: v.string(),
    choice: v.union(v.literal("yes"), v.literal("no"), v.literal("abstain")),
    castAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("proposal_votes")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .filter((q) => q.eq(q.field("memberPub"), args.memberPub))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        choice: args.choice,
        castAt: args.castAt,
      });
    } else {
      await ctx.db.insert("proposal_votes", args);
    }
  },
});

export const listVotes = query({
  args: { proposalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proposal_votes")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .collect();
  },
});

export const addComment = mutation({
  args: {
    commentId: v.string(),
    proposalId: v.string(),
    tribeId: v.string(),
    authorPub: v.string(),
    body: v.string(),
    postedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("proposal_comments", args);
  },
});

export const listComments = query({
  args: { proposalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proposal_comments")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .order("asc")
      .collect();
  },
});
