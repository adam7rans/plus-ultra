/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alerts from "../alerts.js";
import type * as bugout from "../bugout.js";
import type * as comms from "../comms.js";
import type * as consumption from "../consumption.js";
import type * as contacts from "../contacts.js";
import type * as docs from "../docs.js";
import type * as events from "../events.js";
import type * as federation from "../federation.js";
import type * as finance from "../finance.js";
import type * as goals from "../goals.js";
import type * as gridState from "../gridState.js";
import type * as inventory from "../inventory.js";
import type * as invites from "../invites.js";
import type * as map from "../map.js";
import type * as members from "../members.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as production from "../production.js";
import type * as proposals from "../proposals.js";
import type * as psych from "../psych.js";
import type * as push from "../push.js";
import type * as rollcall from "../rollcall.js";
import type * as skills from "../skills.js";
import type * as tasks from "../tasks.js";
import type * as training from "../training.js";
import type * as tribes from "../tribes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  alerts: typeof alerts;
  bugout: typeof bugout;
  comms: typeof comms;
  consumption: typeof consumption;
  contacts: typeof contacts;
  docs: typeof docs;
  events: typeof events;
  federation: typeof federation;
  finance: typeof finance;
  goals: typeof goals;
  gridState: typeof gridState;
  inventory: typeof inventory;
  invites: typeof invites;
  map: typeof map;
  members: typeof members;
  messages: typeof messages;
  notifications: typeof notifications;
  production: typeof production;
  proposals: typeof proposals;
  psych: typeof psych;
  push: typeof push;
  rollcall: typeof rollcall;
  skills: typeof skills;
  tasks: typeof tasks;
  training: typeof training;
  tribes: typeof tribes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
