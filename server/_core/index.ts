import "dotenv/config";
// Sentry must be initialized before other imports
import { initServerSentry } from "../sentry";
initServerSentry();

import { createServer } from "http";
import net from "net";
import { createApp } from "./app";
import { startCronScheduler } from "../cronScheduler";
import { getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = await createApp();
  const server = createServer(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Warm up DB connection on startup so first request doesn't timeout
    getDb().then(() => console.log('[Startup] Database connection warmed up')).catch(() => {});
    // Start in-process cron scheduler (draft reminders, etc.)
    startCronScheduler();
  });
}

startServer().catch(console.error);
