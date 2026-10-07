/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as abandoned from "../abandoned.js";
import type * as checkoutPrices from "../checkoutPrices.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as fixes from "../fixes.js";
import type * as http from "../http.js";
import type * as lib_checkoutMatching from "../lib/checkoutMatching.js";
import type * as lib_shopifyAuth from "../lib/shopifyAuth.js";
import type * as lib_shopifyQueries from "../lib/shopifyQueries.js";
import type * as shopify from "../shopify.js";
import type * as shopifyEvents from "../shopifyEvents.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  abandoned: typeof abandoned;
  checkoutPrices: typeof checkoutPrices;
  crons: typeof crons;
  events: typeof events;
  fixes: typeof fixes;
  http: typeof http;
  "lib/checkoutMatching": typeof lib_checkoutMatching;
  "lib/shopifyAuth": typeof lib_shopifyAuth;
  "lib/shopifyQueries": typeof lib_shopifyQueries;
  shopify: typeof shopify;
  shopifyEvents: typeof shopifyEvents;
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
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
