import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertPin = mutation({
  args: {
    pinId: v.string(),
    tribeId: v.string(),
    assetType: v.string(),
    label: v.string(),
    notes: v.string(),
    lat: v.number(),
    lng: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("map_pins")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("pinId"), args.pinId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        assetType: args.assetType,
        label: args.label,
        notes: args.notes,
        lat: args.lat,
        lng: args.lng,
      });
    } else {
      await ctx.db.insert("map_pins", { ...args });
    }
  },
});

export const upsertRoute = mutation({
  args: {
    routeId: v.string(),
    tribeId: v.string(),
    name: v.string(),
    waypoints: v.any(),
    notes: v.string(),
    assignedTo: v.string(),
    scheduleEventId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("patrol_routes")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .filter((q) => q.eq(q.field("routeId"), args.routeId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        waypoints: args.waypoints,
        notes: args.notes,
        assignedTo: args.assignedTo,
        scheduleEventId: args.scheduleEventId,
      });
    } else {
      await ctx.db.insert("patrol_routes", { ...args });
    }
  },
});

export const upsertTerritory = mutation({
  args: {
    tribeId: v.string(),
    polygon: v.any(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("map_territory")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        polygon: args.polygon,
        updatedAt: args.updatedAt,
        updatedBy: args.updatedBy,
      });
    } else {
      await ctx.db.insert("map_territory", { ...args });
    }
  },
});

export const listPins = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("map_pins")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});

export const listRoutes = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("patrol_routes")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .collect();
  },
});

export const getTerritory = query({
  args: { tribeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("map_territory")
      .withIndex("by_tribe", (q) => q.eq("tribeId", args.tribeId))
      .first();
  },
});
