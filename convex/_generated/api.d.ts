/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_csvActions from "../actions/csvActions.js";
import type * as actions_tableAgentActions from "../actions/tableAgentActions.js";
import type * as agent_tools from "../agent_tools.js";
import type * as agent_utils from "../agent_utils.js";
import type * as auth from "../auth.js";
import type * as authFns from "../authFns.js";
import type * as csv from "../csv.js";
import type * as http from "../http.js";
import type * as insights from "../insights.js";
import type * as notifications from "../notifications.js";
import type * as presence from "../presence.js";
import type * as queryLog from "../queryLog.js";
import type * as table_agent from "../table_agent.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/csvActions": typeof actions_csvActions;
  "actions/tableAgentActions": typeof actions_tableAgentActions;
  agent_tools: typeof agent_tools;
  agent_utils: typeof agent_utils;
  auth: typeof auth;
  authFns: typeof authFns;
  csv: typeof csv;
  http: typeof http;
  insights: typeof insights;
  notifications: typeof notifications;
  presence: typeof presence;
  queryLog: typeof queryLog;
  table_agent: typeof table_agent;
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

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  presence: import("@convex-dev/presence/_generated/component.js").ComponentApi<"presence">;
};
