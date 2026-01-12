
export interface JobListing {
  company: string;
  title: string;
  datePosted: string;
  applyLink: string;
  email?: string;
  location?: string;
  mapUrl?: string;
  descriptionSnippet?: string;
  sourceUrl?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}
