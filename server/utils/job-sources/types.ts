/** Supported job search sources */
export type JobSource =
  | 'jsearch-linkedin'
  | 'jsearch-indeed'
  | 'jsearch-glassdoor'
  | 'swissdevjobs'
  | 'jobsch'
  | 'manual'

/** Normalized job result from any source */
export interface JobSearchResult {
  title: string
  company: string
  location: string
  url: string
  description: string
  source: JobSource
  /** ISO 8601 date string when the job was originally published (if available) */
  published_at?: string
}

/** Common search parameters for all providers */
export interface JobSearchParams {
  keywords: string
  location: string
  workType: '' | 'remote' | 'hybrid' | 'on_site'
  maxResults: number
}

/** Each job source implements this interface */
export interface JobSourceProvider {
  readonly name: JobSource
  readonly label: string
  search(params: JobSearchParams): Promise<JobSearchResult[]>
}
