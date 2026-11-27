import { JobListing, GroundingSource } from "../types";

export const searchJobsWithGemini = async (
  jobName: string,
  location: string = 'Remote'
): Promise<{ jobs: JobListing[]; sources: GroundingSource[] }> => {
  const response = await fetch('/api/jobs/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jobName, location }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' && data.error
        ? data.error
        : `Request failed with status ${response.status}`
    );
  }

  return {
    jobs: Array.isArray(data.jobs) ? data.jobs : [],
    sources: Array.isArray(data.sources) ? data.sources : [],
  };
};
