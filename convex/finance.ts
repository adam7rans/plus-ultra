import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addExpense = mutation({
  args: {
    expenseId: v.string(),
    tribeId: v.string(),
    category: v.string(),
    description: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    paidBy: v.string(),
    splitAmong: v.array(v.string()),
    linkedAssetType: v.optional(v.string()),
    receiptNote: v.optional(v.string()),
    loggedAt: v.number(),
    loggedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("tribe_expenses", { ...args });
  },
});

export const addContribution = mutation({
  args: {
    contributionId: v.string(),
    tribeId: v.string(),
    memberPub: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    note: v.optional(v.string()),
    contributedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("tribe_contributions", { ...args });
  },
});

export const listExpenses = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tribe_expenses")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});

export const listContributions = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tribe_contributions")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});
