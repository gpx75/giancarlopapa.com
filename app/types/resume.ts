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

export interface CoreCompetency {
  requirement: string
  proof: string
}

export interface SuccessStory {
  title: string
  shortForm?: string
  challenge: string
  action: string
  result: string
}

export interface ResumeBasics {
  name: string
  label?: string
  image?: string
  email?: string
  phone?: string
  url?: string
  summary?: string
  summaryPdf?: string
  location?: ResumeLocation
  profiles?: ResumeProfileLink[]
  coreCompetencies?: CoreCompetency[]
  successStories?: SuccessStory[]
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
  successStories?: SuccessStory[]
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
