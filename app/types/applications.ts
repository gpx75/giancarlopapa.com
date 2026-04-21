export type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offered' | 'accepted' | 'rejected' | 'withdrawn'
export type ApplicationPriority = 'p0' | 'p1' | 'p2'
export type WorkModel = 'onsite' | 'hybrid' | 'remote'
export type CoverLetterTone = 'professional' | 'conversational' | 'formal'
export type SuggestionStatus = 'new' | 'reviewing' | 'applied' | 'dismissed'
export type JobSource = 'jsearch-linkedin' | 'jsearch-indeed' | 'jsearch-glassdoor' | 'swissdevjobs' | 'jobsch' | 'ictjobs' | 'manual'

// ---------------------------------------------------------------------------
// Workflow state machine (per application)
// ---------------------------------------------------------------------------
export type WorkflowStage =
  | 'analyze'
  | 'prioritize'
  | 'cv'
  | 'cover_letter'
  | 'review'
  | 'apply'
  | 'interview_prep'
  | 'sent'
  | 'closed'

export type StageStatus = 'pending' | 'in_progress' | 'done'

export type ApplyMode = 'send' | 'export'

export interface ReviewChecklist {
  jd_read?: boolean
  scoring_ok?: boolean
  cv_ok?: boolean
  cover_letter_ok?: boolean
  references_ok?: boolean
  recipient_ok?: boolean
}

export interface InterviewChecklist {
  company_research?: boolean
  role_research?: boolean
  tech_prep?: boolean
  questions_ready?: boolean
  logistics_ready?: boolean
}

export interface WorkflowStages {
  analyze:        { status: StageStatus, last_run_at?: string | null }
  prioritize:     { status: StageStatus, rationale?: string | null }
  cv:             { status: StageStatus, applied_count: number, total_count: number }
  cover_letter:   { status: StageStatus, version_count: number, active_version_id?: number | null }
  review:         { status: StageStatus, checklist: ReviewChecklist }
  apply:          { status: StageStatus, mode?: ApplyMode | null, sent_at?: string | null, exported_at?: string | null }
  interview_prep: { status: StageStatus, notes?: string | null, checklist: InterviewChecklist, scheduled_at?: string | null }
}

export interface ApplicationWorkflow {
  current_stage: WorkflowStage
  stages: WorkflowStages
}

export type WorkflowAction = 'enter' | 'complete' | 'reset' | 'unlock'

export interface WorkflowTransitionPayload {
  stage: WorkflowStage
  action: WorkflowAction
  meta?: Record<string, unknown>
}

export interface WorkflowHistoryEntry {
  id: number
  application_id: number
  stage: WorkflowStage
  action: WorkflowAction | string
  meta: Record<string, unknown> | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Persisted CV suggestions (replaces inline json on application)
// ---------------------------------------------------------------------------
export type CvSuggestionStatus = 'pending' | 'applied' | 'dismissed'

export interface PersistedCvSuggestion {
  id: number
  application_id: number
  run_id: string
  section: string
  issue: string
  suggestion: string
  priority: 'high' | 'medium' | 'low'
  status: CvSuggestionStatus
  applied_note: string | null
  created_at: string
  updated_at: string
}

export interface CvSuggestionUpdatePayload {
  status?: CvSuggestionStatus
  applied_note?: string | null
}

// ---------------------------------------------------------------------------
// Reference letters (per-app selection from content/ref-letters.json)
// ---------------------------------------------------------------------------
export interface ApplicationReferenceLetter {
  id: number
  application_id: number
  letter_slug: string
  attached_at: string
}

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
  // From-fit-to-impact framing (optional; older analyses won't have these).
  companyPainPoints?: string[]
  valueDelivered?: string[]
  measurableImpact?: string[]
  whyJoin?: string
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
  priority: ApplicationPriority | null
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
  cv_suggestions?: CvSuggestion[] | null
  tailored_resume?: Record<string, unknown> | null
  workflow: ApplicationWorkflow
  deleted_at?: string | null
}

export interface CoverLetter {
  id: number
  application_id: number
  version: number
  content: string
  tone: CoverLetterTone
  is_sent: boolean
  is_active: boolean
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
  match_breakdown: MatchBreakdown | null
  status: SuggestionStatus
  published_at: string | null
  created_at: string
  dismissed_at?: string | null
  snoozed_until?: string | null
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
  priority?: ApplicationPriority | null
  salary_range?: string | null
  notes?: string | null
  contact_email?: string | null
  job_description?: string | null
  applied_at?: string | null
  interviewed_at?: string | null
  decided_at?: string | null
}

export interface GenerateCoverLetterPayload {
  tone?: CoverLetterTone
  instructions?: string
  draft?: boolean
}

export interface CoverLetterDraft {
  content: string
  tone: CoverLetterTone
}

export interface CreateSuggestionPayload {
  title: string
  company: string
  url?: string
  location?: string
  description?: string
  source?: string
}
