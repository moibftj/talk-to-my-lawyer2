/**
 * TypeScript declarations for virtual modules injected by vite-plugin-fullstack.
 *
 * These modules are generated at build/dev time — they have no physical files.
 */

// ─── virtual:trpc ─────────────────────────────────────────────────────────────
declare module "virtual:trpc" {
  import type { createTRPCReact } from "@trpc/react-query";
  import type { AppRouter } from "../../server/routers";

  export const trpc: ReturnType<typeof createTRPCReact<AppRouter>>;
  export function buildTrpcClient(): ReturnType<
    ReturnType<typeof createTRPCReact<AppRouter>>["createClient"]
  >;
  export type { AppRouter };
}

// ─── virtual:supabase ─────────────────────────────────────────────────────────
declare module "virtual:supabase" {
  import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

  /** Returns the singleton Supabase client, or null when env vars are absent. */
  export function getSupabaseClient(): SupabaseClient | null;

  export function getOrCreateChannel(
    key: string,
    factory: (client: SupabaseClient) => RealtimeChannel,
  ): RealtimeChannel | null;

  export function removeChannel(key: string): void;
}

// ─── virtual:router ───────────────────────────────────────────────────────────
declare module "virtual:router" {
  export const ROUTES: {
    readonly home: "/";
    readonly login: "/login";
    readonly signup: "/signup";
    readonly forgotPassword: "/forgot-password";
    readonly verifyEmail: "/verify-email";
    readonly dashboard: "/dashboard";
    readonly letter: "/letter/:id";
    readonly letterNew: "/letter/new";
    readonly intake: "/intake";
    readonly profile: "/profile";
    readonly review: "/review/:id";
    readonly reviewQueue: "/review/queue";
    readonly admin: "/admin";
    readonly adminUsers: "/admin/users";
    readonly adminLetters: "/admin/letters";
    readonly adminStats: "/admin/stats";
    readonly pricing: "/pricing";
    readonly termsOfService: "/terms";
    readonly privacyPolicy: "/privacy";
  };

  export type RouteName = keyof typeof ROUTES;
  export type RoutePath = (typeof ROUTES)[RouteName];

  /** Resolve a route by name, interpolating :param placeholders. */
  export function route(
    name: RouteName,
    params?: Record<string, string | number>,
  ): string;

  /** The path unauthenticated users are redirected to. */
  export const LOGIN_PATH: "/login";
}
