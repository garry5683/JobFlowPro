import type { VercelRequest, VercelResponse } from "@vercel/node";
import { searchJobs, extractErrorDetails, MAX_QUERY_LENGTH } from "../../lib/jobSearch.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const body = req.body as { jobName?: unknown; location?: unknown } | undefined;

  if (!body || typeof body.jobName !== "string" || !body.jobName.trim()) {
    res.status(400).json({ error: "A valid job title is required." });
    return;
  }

  const jobName = body.jobName.trim();
  const location =
    typeof body.location === "string" && body.location.trim() ? body.location.trim() : "Remote";

  if (jobName.length > MAX_QUERY_LENGTH || location.length > MAX_QUERY_LENGTH) {
    res.status(400).json({ error: `Search parameters must be ${MAX_QUERY_LENGTH} characters or fewer.` });
    return;
  }

  try {
    res.status(200).json(await searchJobs(jobName, location));
  } catch (error) {
    const { status, message } = extractErrorDetails(error);
    console.error(`Gemini Search Error (${status}):`, message);
    res.status(status).json({ error: message });
  }
}
