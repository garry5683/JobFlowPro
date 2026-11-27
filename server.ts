import "dotenv/config";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import type { Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import type { JobListing, GroundingSource } from "./types.ts";

// Load .env.local as a fallback without overriding existing environment variables
dotenv.config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MAX_QUERY_LENGTH = 200;

function sanitizeExternalUrl(url: unknown): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // Ignore malformed URLs
  }
  return "";
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface ParsedApiError {
  status: number;
  apiStatus?: string;
  message: string;
}

function extractErrorDetails(error: unknown): ParsedApiError {
  let status = 500;
  let apiStatus: string | undefined;
  let message = "Failed to search jobs via Gemini API.";

  if (error && typeof error === "object") {
    const errObj = error as { status?: unknown; code?: unknown; message?: unknown };
    if (typeof errObj.status === "number" && errObj.status >= 400 && errObj.status < 600) {
      status = errObj.status;
    } else if (typeof errObj.code === "number" && errObj.code >= 400 && errObj.code < 600) {
      status = errObj.code;
    }

    if (typeof errObj.message === "string" && errObj.message.trim()) {
      const rawMsg = errObj.message.trim();
      message = rawMsg;

      // Unwrap nested JSON error payloads returned by @google/genai
      try {
        const parsed = JSON.parse(rawMsg) as {
          error?: { code?: unknown; status?: unknown; message?: unknown };
        };
        if (parsed?.error) {
          if (typeof parsed.error.code === "number" && parsed.error.code >= 400 && parsed.error.code < 600) {
            status = parsed.error.code;
          }
          if (typeof parsed.error.status === "string") {
            apiStatus = parsed.error.status;
          }
          if (typeof parsed.error.message === "string" && parsed.error.message.trim()) {
            message = parsed.error.message.trim();
          }
        }
      } catch {
        // Keep raw message if not JSON
      }
    }
  }

  if (status === 429 || apiStatus === "RESOURCE_EXHAUSTED") {
    return {
      status: 429,
      apiStatus: "RESOURCE_EXHAUSTED",
      message:
        "Gemini API quota or rate limit exceeded. Please wait a moment and try again, or select a billing-enabled API key in Settings > Secrets.",
    };
  }

  if (status === 403 || apiStatus === "PERMISSION_DENIED" || apiStatus === "API_KEY_INVALID") {
    return {
      status,
      apiStatus,
      message:
        "Gemini API access denied. Please verify your API key in Settings > Secrets.",
    };
  }

  return { status, apiStatus, message };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry<T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const details = extractErrorDetails(error);
      const isRetryable = details.status === 429 || details.status === 503;
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      const delayMs = 1000 * Math.pow(2, attempt);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

function parseJobsJson(rawText: string): JobListing[] {
  const trimmed = rawText.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed: unknown = JSON.parse(unfenced || "[]");
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter((item): item is JobListing => item !== null && typeof item === "object");
}

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
      const ai = getGenAIClient();
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Find as many as possible (up to 40) unique and recent job listings for "${jobName}" in "${location}". 
      Target diverse sources including company career pages, LinkedIn, Indeed, and niche job boards.
      
      For each job, extract: 
      1. Company Name
      2. Job Title
      3. Date Posted (relative, like '2 days ago')
      4. Application Link (the direct or portal URL)
      5. Any contact email found.
      6. A descriptive location (City, State/Country).
      
      Also, for each company, generate a Google Maps search URL based on the company name and location.
      
      Format the output strictly as a JSON list of objects.`,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  title: { type: Type.STRING },
                  datePosted: { type: Type.STRING },
                  applyLink: { type: Type.STRING },
                  email: { type: Type.STRING },
                  location: { type: Type.STRING },
                  mapUrl: {
                    type: Type.STRING,
                    description: "A Google Maps URL searching for this company at this location",
                  },
                  descriptionSnippet: { type: Type.STRING },
                },
                required: ["company", "title", "datePosted", "applyLink", "location"],
              },
            },
          },
        })
      );

      const jsonStr = response.text || "[]";
      const parsedJobs = parseJobsJson(jsonStr);

      const jobs: JobListing[] = parsedJobs.map((job) => {
        const company = typeof job.company === "string" ? job.company : "";
        const loc = typeof job.location === "string" ? job.location : "";
        const fallbackMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${company} ${loc}`.trim()
        )}`;
        const safeMapUrl = sanitizeExternalUrl(job.mapUrl) || fallbackMapUrl;
        const safeApplyLink = sanitizeExternalUrl(job.applyLink) || "#";

        return {
          ...job,
          company,
          title: typeof job.title === "string" ? job.title : "",
          datePosted: typeof job.datePosted === "string" ? job.datePosted : "",
          location: loc,
          applyLink: safeApplyLink,
          mapUrl: safeMapUrl,
        };
      });

      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: GroundingSource[] = groundingChunks
        .filter(
          (chunk): chunk is { web: { title?: string; uri?: string } } =>
            Boolean(chunk && typeof chunk === "object" && "web" in chunk && chunk.web)
        )
        .map((chunk) => ({
          title: chunk.web.title || chunk.web.uri || "Source",
          uri: sanitizeExternalUrl(chunk.web.uri),
        }))
        .filter((source) => Boolean(source.uri));

      res.json({ jobs, sources });
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
