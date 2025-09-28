export interface ResumeProfileLink {
  network: string
  username?: string
  url?: string
}

export interface ResumeLocation {
  address?: string
  postalCode?: string
  city?: string
  countryCode?: string
  region?: string
}

export interface ResumeBasics {
  name: string
  label?: string
  image?: string
  email?: string
  phone?: string
  url?: string
  summary?: string
  location?: ResumeLocation
  profiles?: ResumeProfileLink[]
}

export interface ResumeWork {
  name: string
  location?: string
  position?: string
  url?: string
  startDate?: string
  endDate?: string
  summary?: string
  highlights?: string[]
}

export interface ResumeEducation {
  institution: string
  location?: string
  studyType?: string
  area?: string
  startDate?: string
  endDate?: string
  gpa?: string
}

export interface ResumeSkill {
  name: string
  level?: string
  keywords?: string[]
}

export interface ResumeLanguage {
  language: string
  fluency?: string
}

export interface ResumeInterest {
  name: string
  keywords?: string[]
}

export interface ResumeDocument {
  basics: ResumeBasics
  work?: ResumeWork[]
  education?: ResumeEducation[]
  skills?: ResumeSkill[]
  languages?: ResumeLanguage[]
  interests?: ResumeInterest[]
  [key: string]: unknown
}
