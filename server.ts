import "dotenv/config";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import type { Request, Response } from "express";
import { searchJobs, extractErrorDetails, MAX_QUERY_LENGTH } from "./lib/jobSearch.ts";

// Load .env.local as a fallback without overriding existing environment variables
dotenv.config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;


async function createApp() {
  const app = express();
  app.use(express.json({ limit: "16kb" }));

  app.post("/api/jobs/search", async (req: Request, res: Response) => {
    const body = req.body as { jobName?: unknown; location?: unknown } | undefined;

    if (!body || typeof body.jobName !== "string" || !body.jobName.trim()) {
      res.status(400).json({ error: "A valid job title is required." });
      return;
    }

    const jobName = body.jobName.trim();
    const location =
      typeof body.location === "string" && body.location.trim()
        ? body.location.trim()
        : "Remote";

    if (jobName.length > MAX_QUERY_LENGTH || location.length > MAX_QUERY_LENGTH) {
      res.status(400).json({
        error: `Search parameters must be ${MAX_QUERY_LENGTH} characters or fewer.`,
      });
      return;
    }

    try {
      res.json(await searchJobs(jobName, location));
    } catch (error) {
      const { status, message } = extractErrorDetails(error);
      console.error(`Gemini Search Error (${status}):`, message);
      res.status(status).json({ error: message });
    }
  });

  // Return JSON 404 for unknown API routes
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "API route not found." });
  });

  const distDir = path.resolve(__dirname, "dist");
  const hasDistBuild = fs.existsSync(path.join(distDir, "index.html"));
  const isDev =
    process.env.NODE_ENV === "development" ||
    (process.env.NODE_ENV !== "production" && !hasDistBuild);

  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  return app;
}

createApp()
  .then((app) => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
