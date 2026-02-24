export interface CvActionLink {
  label: string
  to: string
  icon?: string
  external?: boolean
}

export interface CvContactLink {
  label: string
  to: string
  icon: string
}

export interface CvStat {
  label: string
  value: string
}

export interface CvCallToAction {
  label: string
  to: string
}

export interface CvHero {
  name: string
  role: string
  location: string
  availability: string
  summary: string[]
  actions: CvActionLink[]
  contactLinks: CvContactLink[]
}

export interface CvExperienceItem {
  company: string
  role: string
  period: string
  location: string
  summary: string
  achievements: string[]
  stack: string[]
}

export interface CvProjectItem {
  name: string
  summary: string
  links: CvActionLink[]
  stack: string[]
}

export interface CvWritingItem {
  title: string
  description: string
  platform: string
  to: string
  publishedAt: string
}

export interface CvSkillGroup {
  label: string
  items: string[]
}

export interface CvProfile {
  hero: CvHero
  about: string[]
  stats: CvStat[]
  experience: CvExperienceItem[]
  projects: CvProjectItem[]
  skills: CvSkillGroup[]
  writing: CvWritingItem[]
  contact: {
    headline: string
    subline: string
    cta: CvCallToAction
  }
}
