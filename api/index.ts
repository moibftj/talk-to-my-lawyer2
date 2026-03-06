import "dotenv/config";
// Sentry must be initialized before other imports
import { initServerSentry } from "../server/sentry";
initServerSentry();

import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../server/_core/app";

// Cache the Express app across warm Vercel invocations to avoid
// rebuilding middleware chains on every request.
let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  app(req as any, res as any);
}
