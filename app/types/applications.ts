export type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offered' | 'accepted' | 'rejected' | 'withdrawn'
export type WorkModel = 'onsite' | 'hybrid' | 'remote'
export type CoverLetterTone = 'professional' | 'conversational' | 'formal'
export type SuggestionStatus = 'new' | 'reviewing' | 'applied' | 'dismissed'
export type JobSource = 'jsearch-linkedin' | 'jsearch-indeed' | 'jsearch-glassdoor' | 'swissdevjobs' | 'jobsch' | 'manual'

export interface MatchBreakdown {
  skills: number
  experience: number
  industry: number
  seniority: number
  techStack: number
  location?: number
  summary: string
  strongMatches: string[]
  gaps: string[]
}

export interface CvSuggestion {
  section: string
  issue: string
  suggestion: string
  priority: 'high' | 'medium' | 'low'
}

export interface JobApplication {
  id: number
  company: string
  position: string
  url: string | null
  location: string | null
  work_model: WorkModel | null
  status: ApplicationStatus
  match_rate: number | null
  match_breakdown: MatchBreakdown | null
  job_description: string | null
  salary_range: string | null
  notes: string | null
  contact_email: string | null
  applied_at: string | null
  interviewed_at: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
}

export interface CoverLetter {
  id: number
  application_id: number
  version: number
  content: string
  tone: CoverLetterTone
  is_sent: boolean
  created_at: string
  updated_at: string
}

export interface JobSuggestion {
  id: number
  title: string
  company: string
  url: string | null
  location: string | null
  description: string | null
  source: string
  match_rate: number | null
  status: SuggestionStatus
  published_at: string | null
  created_at: string
}

export interface CreateApplicationPayload {
  company: string
  position: string
  url?: string
  location?: string
  work_model?: WorkModel
  job_description?: string
  salary_range?: string
  notes?: string
  contact_email?: string
}

export interface UpdateApplicationPayload {
  company?: string
  position?: string
  url?: string
  location?: string
  work_model?: WorkModel | null
  status?: ApplicationStatus
  salary_range?: string | null
  notes?: string | null
  contact_email?: string | null
  applied_at?: string | null
  interviewed_at?: string | null
  decided_at?: string | null
}

export interface GenerateCoverLetterPayload {
  tone?: CoverLetterTone
  instructions?: string
}

export interface CreateSuggestionPayload {
  title: string
  company: string
  url?: string
  location?: string
  description?: string
  source?: string
}
