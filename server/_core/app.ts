import { Sentry } from "../sentry";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerSupabaseAuthRoutes } from "../supabaseAuth";
import { registerChatRoutes } from "./chat";
import { registerN8nCallbackRoute } from "../n8nCallback";
import { registerEmailPreviewRoute } from "../emailPreview";
import { registerDraftRemindersRoute } from "../draftReminders";
import { stripeWebhookHandler } from "../stripeWebhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import {
  authRateLimitMiddleware,
  generalRateLimitMiddleware,
} from "../rateLimiter";

/**
 * Creates and configures the Express application.
 * Does NOT call app.listen() or start the cron scheduler —
 * those are the responsibility of the caller (index.ts for local,
 * api/index.ts for Vercel).
 */
export async function createApp() {
  const app = express();
  const server = createServer(app);

  // ⚠️ Stripe webhook MUST be registered BEFORE express.json() to get raw body
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ─── Rate Limiting ──────────────────────────────────────────────────────────
  // Auth endpoints: 10 req / 15 min per IP (protects against brute force)
  app.use("/api/auth/login", authRateLimitMiddleware);
  app.use("/api/auth/signup", authRateLimitMiddleware);
  app.use("/api/auth/forgot-password", authRateLimitMiddleware);
  // tRPC API: 60 req / 1 min per IP (broad abuse guard)
  app.use("/api/trpc", generalRateLimitMiddleware);
  // ───────────────────────────────────────────────────────────────────────────

  // Supabase Auth routes (signup, login, logout, refresh, forgot-password, reset-password)
  registerSupabaseAuthRoutes(app);
  // Legacy Manus OAuth callback (kept for backward compatibility)
  registerOAuthRoutes(app);
  // Chat API with streaming and tool calling
  registerChatRoutes(app);
  // n8n pipeline callback endpoint
  registerN8nCallbackRoute(app);
  // Dev-only email template preview (disabled in production)
  registerEmailPreviewRoute(app);
  // Cron: 48-hour draft reminder emails for unpaid generated_locked letters
  registerDraftRemindersRoute(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // ─── Sentry Express error handler (must be before other error handlers) ───
  Sentry.setupExpressErrorHandler(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  return app;
}
