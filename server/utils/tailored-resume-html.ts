import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Only the current role renders bullet highlights, and only the first N of
// them — keep this in sync with workEntry()'s default below.
export const MAX_CURRENT_ROLE_HIGHLIGHTS = 4

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(d: string, labels: ResumeLabels): string {
  if (!d || d.toLowerCase() === 'present') return labels.present
  const parts = d.split('-')
  const y = parts[0] ?? d
  const m = parts[1]
  if (!m) return y
  return new Date(Number(y), Number(m) - 1).toLocaleDateString(labels.locale, { month: 'short', year: 'numeric' })
}

function highlight(text: string, keywords: string[]): string {
  if (!keywords.length) return esc(text)
  const sorted = [...keywords].sort((a, b) => b.length - a.length)
  const escaped = sorted.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  return esc(text).replace(pattern, '<span style="color:#3a9eae;font-weight:bold">$1</span>')
}

/**
 * Job-ad title as a CV headline: drops workload ("60-100%", "80–100 %"),
 * gender markers ("(m/w/d)", "(f/m/x)", "m/f/d") and dangling separators.
 */
export function cleanJobTitle(title: string): string {
  return title
    .replace(/\(\s*[mwfdx]\s*(?:\/\s*[mwfdx]\s*)+\)/gi, '')
    .replace(/\b[mwfdx](?:\s*\/\s*[mwfdx]){1,2}\b/gi, '')
    .replace(/\(?\s*\d{1,3}\s*(?:[-–]\s*\d{1,3}\s*)?%\s*\)?/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,|/–-]+$/, '')
    .trim()
}

let cachedAvatar: string | null | undefined

function getAvatar(): string | null {
  if (cachedAvatar !== undefined) return cachedAvatar
  try {
    const p = resolve(process.cwd(), 'public/giancarlopapa.jpeg')
    if (existsSync(p)) {
      cachedAvatar = `data:image/jpeg;base64,${readFileSync(p).toString('base64')}`
    } else {
      cachedAvatar = null
    }
  } catch {
    cachedAvatar = null
  }
  return cachedAvatar
}

interface ResumeData {
  basics: {
    name: string
    label?: string
    email: string
    phone: string
    url: string
    summary?: string
    summaryPdf?: string
    coreCompetencies?: Array<{ requirement: string; proof: string }>
    location: { city: string; region: string; countryCode: string; postalCode: string }
    profiles: Array<{ network: string; url: string }>
  }
  work?: Array<{
    name: string
    location?: string
    position: string
    startDate: string
    endDate?: string
    summary?: string
    highlights?: string[]
    successStories?: Array<{ title: string; shortForm?: string }>
  }>
  skills?: Array<{ name: string; keywords: string[] }>
  education?: Array<{
    institution: string
    studyType?: string
    area?: string
    startDate?: string
    endDate?: string
  }>
  languages?: Array<{ language: string; fluency: string }>
  projects?: Array<{ name: string; description: string }>
  interests?: Array<{ name: string; keywords: string[] }>
}

export function buildTailoredResumeHtml(
  resume: ResumeData,
  keywords: string[],
  _company: string,
  position: string,
  language: ResumeLanguage = 'en'
): string {
  const labels = getResumeLabels(language)
  const { basics, work, skills, education, languages, projects, interests } = resume
  const coreCompetencies = basics.coreCompetencies ?? []
  const summaryPdf = basics.summaryPdf ?? basics.summary ?? ''
  // Headline mirrors the job ad's title; the master label is only a fallback.
  const roleTitle = cleanJobTitle(position) || basics.label || 'Senior Full Stack Engineer'

  const githubProfile = basics.profiles.find(p => p.network === 'GitHub')
  const linkedinProfile = basics.profiles.find(p => p.network === 'LinkedIn')

  const allWork = work ?? []
  const currentWork = allWork.filter(j => !j.endDate || j.endDate === '')
  const previousWork = allWork.filter(j => j.endDate && j.endDate !== '')

  const kwLower = keywords.map(k => k.toLowerCase())
  const sortedSkills = [...(skills ?? [])].sort((a, b) => {
    const aMatch = a.keywords.some(k => kwLower.includes(k.toLowerCase())) ? 0 : 1
    const bMatch = b.keywords.some(k => kwLower.includes(k.toLowerCase())) ? 0 : 1
    return aMatch - bMatch
  })

  // Skip projects already told as a success story (e.g. "AMP — …" vs
  // "AMP Platform — …") — relevance over repetition, and it keeps 2 pages.
  // Match the project's key word anywhere in a story title, as a whole word —
  // word order differs by language ("AMP-Plattform", "Plateforme AMP").
  const words = (t: string) => t.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const storyWords = new Set(allWork.flatMap(j => (j.successStories ?? []).flatMap(s => words(s.title))))
  const extraProjects = (projects ?? []).filter(p => !storyWords.has(words(p.name)[0] ?? ''))

  // Success stories are one global section under the summary (challenge →
  // result, 1–2 lines each), not buried inside each job entry.
  const stories = allWork.flatMap(j => j.successStories ?? [])
    .filter(s => s.shortForm)
    .map(s => `<li><strong>${esc(s.title)}:</strong> ${highlight(s.shortForm!, keywords)}</li>`)

  const avatar = getAvatar()

  const contactItem = (label: string, text: string) =>
    `<span class="contact-item"><strong>${label}:</strong> ${esc(text)}</span>`

  const sectionHeader = (title: string) => `
    <div class="section-hdr">
      <div class="section-title">${esc(title)}</div>
      <div class="section-rule"></div>
    </div>`

  // Page-break control: a heading is wrapped in one unbreakable block with
  // the first item of its section, so it can never be stranded at the bottom
  // of a page (Chrome ignores break-after: avoid). Items after the first
  // flow freely. `list` wraps items in a <ul> of that class.
  const section = (title: string, items: string[], list?: string) => {
    if (!items.length) return ''
    const wrap = (html: string) => (list ? `<ul class="${list}">${html}</ul>` : html)
    const [first, ...rest] = items
    return `
      <div class="keep">${sectionHeader(title)}${wrap(first!)}</div>
      ${rest.length ? wrap(rest.join('')) : ''}`
  }

  type WorkItem = NonNullable<ResumeData['work']>[number]

  // A job's title, company line and first bullet stay together (plus the
  // section heading for the first job); later bullets may move to the next page.
  const workEntry = (job: WorkItem, heading = '') => {
    const highlights = (job.highlights ?? []).slice(0, MAX_CURRENT_ROLE_HIGHLIGHTS)
      .map(h => `<li>${highlight(h, keywords)}</li>`)
    const [first, ...rest] = highlights
    const dateRange = `${fmtDate(job.startDate, labels)} – ${fmtDate(job.endDate ?? '', labels)}`
    const meta = [job.name, job.location, dateRange].filter(Boolean).join(' · ')
    return `
      <div class="work-row">
        <div class="keep">
          ${heading}
          <div class="jobtitle">${esc(job.position)}</div>
          <div class="company-line">${esc(meta)}</div>
          ${first ? `<ul class="highlights">${first}</ul>` : ''}
        </div>
        ${rest.length ? `<ul class="highlights">${rest.join('')}</ul>` : ''}
      </div>`
  }

  const workEntryCompact = (job: WorkItem, heading = '') => {
    const dateRange = `${fmtDate(job.startDate, labels)} – ${fmtDate(job.endDate ?? '', labels)}`
    const meta = [job.name, job.location, dateRange].filter(Boolean).join(' · ')
    return `
      <div class="work-row keep">
        ${heading}
        <div class="jobtitle">${esc(job.position)}</div>
        <div class="company-line">${esc(meta)}</div>
        ${job.summary ? `<div class="jsummary">${highlight(job.summary, keywords)}</div>` : ''}
      </div>`
  }

  const workSection = (title: string, jobs: WorkItem[], entry: typeof workEntry) =>
    jobs.map((j, i) => entry(j, i === 0 ? sectionHeader(title) : '')).join('')

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:ital,wght@0,400;0,700;1,400&display=swap');
  @page { size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { height: auto; }
  body { font-family: 'JetBrains Mono','Courier New',Courier,monospace; font-size: 10pt; color: #1a1a2e; line-height: 1.35; background: white; }

  /* ── Header ── */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
  .hdr-left { flex: 1; min-width: 0; }
  .role-title { font-family: 'Space Grotesk', sans-serif; font-size: 16pt; font-weight: 700; color: #0f172a; line-height: 1.2; margin-bottom: 0.4em; }
  .name { font-family: 'Space Grotesk', sans-serif; font-size: 20pt; font-weight: 400; color: #3a9eae; margin-bottom: 3px; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.05em; }
  .name strong { font-weight: 800; margin-right: 0.15em; }
  .education-header { font-size: 10pt; color: #64748b; margin-bottom: 3px; }
  .contact-line { font-size: 10pt; color: #64748b; line-height: 1.5; margin-bottom: 1px; }
  .contact-item { white-space: nowrap; }
  .contact-item + .contact-item::before { content: '  ·  '; color: #94a3b8; }
  .lang-header { font-size: 10pt; color: #64748b; line-height: 1.5; }
  .avatar { width: 100px; height: 100px; min-width: 100px; border-radius: 50%; overflow: hidden; margin-left: 14px; flex-shrink: 0; border: 2px solid #e2e8f0; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }

  /* ── Summary ── */
  .summary { font-size: 10pt; color: #334155; line-height: 1.25; margin-bottom: 0; }

  /* ── Section headers ── */
  .keep { break-inside: avoid; page-break-inside: avoid; }
  .section-hdr { margin-top: 12px; margin-bottom: 4px; }
  .section-title { font-family: 'Space Grotesk', sans-serif; font-size: 11pt; font-weight: 700; color: #3a9eae; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; margin-top: 16px; }
  .section-rule { width: 100%; height: 1px; background: #cbd5e1; margin-top: 1px; }

  /* ── Core Competencies ── */
  .competencies { list-style: none; margin-top: 2px; }
  .competencies li { font-size: 10pt; color: #334155; line-height: 1.25; padding-left: 12px; position: relative; margin-bottom: 0; }
  .competencies li::before { content: '•'; position: absolute; left: 0; color: #3a9eae; }

  /* ── Work entries ── */
  /* Long entries may split across pages, but only between bullets. */
  .work-row { margin-bottom: 4px; }
  .work-row li { break-inside: avoid; page-break-inside: avoid; }
  .work-row-compact { margin-bottom: 4px; }
  .jobtitle { font-family: 'Space Grotesk', sans-serif; font-size: 10pt; font-weight: 700; color: #0f172a; }
  .company-line { font-size: 10pt; color: #64748b; margin-bottom: 1px; }
  .jsummary { font-size: 10pt; color: #334155; line-height: 1.25; margin-top: 1px; }
  .highlights { list-style: none; margin-top: 1px; }
  .highlights li { font-size: 10pt; color: #334155; line-height: 1.25; padding-left: 12px; position: relative; margin-bottom: 0; }
  .highlights li::before { content: '•'; position: absolute; left: 0; }

  /* ── Success Stories ── */
  .stories { list-style: none; margin-top: 2px; }
  .stories li { font-size: 10pt; color: #334155; line-height: 1.25; padding-left: 12px; position: relative; margin-bottom: 1px; break-inside: avoid; page-break-inside: avoid; }
  .stories li::before { content: '▸'; position: absolute; left: 0; color: #3a9eae; }

  /* ── Skills ── */
  .skill-row { margin-bottom: 1px; break-inside: avoid; page-break-inside: avoid; }
  .skill-label { font-family: 'Space Grotesk', sans-serif; font-size: 10pt; font-weight: 700; color: #0f172a; display: inline; }
  .skill-kw-inline { font-size: 10pt; color: #334155; line-height: 1.3; }

  /* ── Projects ── */
  .project-row { margin-bottom: 3px; page-break-inside: avoid; }
  .project-name { font-family: 'Space Grotesk', sans-serif; font-size: 10pt; font-weight: 700; color: #0f172a; }
  .project-desc { font-size: 10pt; color: #334155; line-height: 1.25; margin-top: 1px; }

  /* ── Languages & Education ── */
  .lang-line { font-size: 10pt; color: #334155; line-height: 1.3; }
  .edu-entry { margin-bottom: 2px; page-break-inside: avoid; }

  /* ── Accent bar ── */
  .accent-bar { height: 3px; background: linear-gradient(90deg, #2a7a8a 0%, #3a9eae 100%); margin-bottom: 10px; border-radius: 1px; }
</style>
</head>
<body>
  <div class="accent-bar"></div>

  <div class="header">
    <div class="hdr-left">
      <div class="role-title">${esc(roleTitle)}</div>
      <div class="name"><strong>${esc(basics.name.split(' ')[0]!)}</strong>${esc(basics.name.split(' ').slice(1).join(' '))}</div>
      <div class="contact-line">
        ${contactItem(labels.contact.email, basics.email)}
        ${contactItem(labels.contact.phone, basics.phone)}
      </div>
      <div class="contact-line">
        ${contactItem(labels.contact.location, `${basics.location.postalCode} ${basics.location.city}, ${basics.location.region} — ${basics.location.countryCode}`)}
        ${contactItem(labels.contact.web, basics.url.replace('https://', ''))}
      </div>
      <div class="contact-line">
        ${githubProfile ? contactItem('GitHub', githubProfile.url.replace('https://', '')) : ''}
        ${linkedinProfile ? contactItem('LinkedIn', linkedinProfile.url.replace('https://', '')) : ''}
      </div>
      ${languages ? `<div class="lang-header">
        <strong>${esc(labels.contact.languages)}:</strong> ${languages.filter(l => l.fluency !== 'Basic knowledge').map(l => `${esc(l.language)} ${esc(l.fluency)}`).join(' · ')}
      </div>` : ''}
    </div>
    ${avatar ? `<div class="avatar"><img src="${avatar}" alt=""></div>` : ''}
  </div>

  ${section(labels.sections.summary, [`<p class="summary">${esc(summaryPdf)}</p>`])}

  ${section(labels.successStories, stories, 'stories')}

  ${section(labels.sections.coreCompetencies, coreCompetencies.map(c =>
    `<li><strong>${esc(c.requirement)}</strong> — ${highlight(c.proof, keywords)}</li>`
  ), 'competencies')}

  ${workSection(labels.sections.workExperience, currentWork, workEntry)}

  ${workSection(labels.sections.previousWorkExperience, previousWork, workEntryCompact)}

  ${section(labels.sections.keyProjects, extraProjects.map(p => `
    <div class="project-row">
      <div class="project-name">${esc(p.name)}</div>
      <div class="project-desc">${highlight(p.description, keywords)}</div>
    </div>`))}

  ${section(labels.sections.technicalSkills, sortedSkills.map(g => `
    <div class="skill-row">
      <span class="skill-label">${esc(g.name)}:</span>
      <span class="skill-kw-inline">${g.keywords.map(k => highlight(k, keywords)).join(', ')}</span>
    </div>`))}

  ${section(labels.sections.education, (education ?? []).map(edu => `
    <div class="edu-entry">
      <div class="jobtitle">${esc(edu.institution)}</div>
      <div class="company-line">${esc([edu.studyType, edu.area].filter(Boolean).join(' · '))}</div>
      <div class="company-line">${esc([edu.startDate, edu.endDate].filter(Boolean).join(' – '))}</div>
    </div>`))}

  ${section(labels.sections.interests, interests?.length ? [`
    <div class="lang-line">
      ${interests.map(g => `<strong>${esc(g.name)}:</strong> ${g.keywords.map(k => esc(k)).join(', ')}`).join(' &nbsp;·&nbsp; ')}
    </div>`] : [])}
</body>
</html>`
}
