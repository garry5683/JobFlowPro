
import { GoogleGenAI, Type } from "@google/genai";
import { JobListing, GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const searchJobsWithGemini = async (jobName: string, location: string = 'Remote'): Promise<{ jobs: JobListing[], sources: GroundingSource[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
              mapUrl: { type: Type.STRING, description: "A Google Maps URL searching for this company at this location" },
              descriptionSnippet: { type: Type.STRING }
            },
            required: ["company", "title", "datePosted", "applyLink", "location"]
          }
        }
      },
    });

    const jsonStr = response.text || "[]";
    let jobs: JobListing[] = JSON.parse(jsonStr);
    
    // Fallback: Generate mapUrl if model missed it
    jobs = jobs.map(job => ({
      ...job,
      mapUrl: job.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.company + ' ' + (job.location || ''))}`
    }));

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    return { jobs, sources };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};
