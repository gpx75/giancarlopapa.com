function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(d: string): string {
  if (!d || d.toLowerCase() === 'present') return 'Present'
  const parts = d.split('-')
  const y = parts[0] ?? d
  const m = parts[1]
  if (!m) return y
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' })
}

/**
 * Highlight matched keywords in a plain text string.
 * Returns HTML with teal bold spans wrapping case-insensitive matches.
 */
function highlight(text: string, keywords: string[]): string {
  if (!keywords.length) return esc(text)
  // Sort longest first so multi-word phrases match before their component words
  const sorted = [...keywords].sort((a, b) => b.length - a.length)
  const escaped = sorted.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  return esc(text).replace(pattern, '<span style="color:#3a9eae;font-weight:bold">$1</span>')
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
  _position: string
): string {
  const { basics, work, skills, education, languages, projects, interests } = resume
  const coreCompetencies = basics.coreCompetencies ?? []
  const summaryPdf = basics.summaryPdf ?? basics.summary ?? ''

  const githubProfile = basics.profiles.find(p => p.network === 'GitHub')
  const linkedinProfile = basics.profiles.find(p => p.network === 'LinkedIn')

  const allWork = work ?? []
  const currentWork = allWork.filter(j => !j.endDate || j.endDate === '')
  const previousWork = allWork.filter(j => j.endDate && j.endDate !== '')

  // Sort skills: groups that contain any matched keyword float to the top
  const kwLower = keywords.map(k => k.toLowerCase())
  const sortedSkills = [...(skills ?? [])].sort((a, b) => {
    const aMatch = a.keywords.some(k => kwLower.includes(k.toLowerCase())) ? 0 : 1
    const bMatch = b.keywords.some(k => kwLower.includes(k.toLowerCase())) ? 0 : 1
    return aMatch - bMatch
  })

  const contactItem = (label: string, text: string) =>
    `<span class="contact-item"><strong>${label}:</strong> ${esc(text)}</span>`

  const sectionHeader = (title: string, newPage = false) => `
    <div class="section-hdr${newPage ? ' section-page-break' : ''}">
      <div class="section-title">${esc(title)}</div>
      <div class="section-rule"></div>
    </div>`

  const workEntry = (job: NonNullable<ResumeData['work']>[number], maxHighlights = 4) => {
    const highlights = (job.highlights ?? []).slice(0, maxHighlights)
      .map(h => `<li>${highlight(h, keywords)}</li>`).join('')
    const stories = (job.successStories ?? [])
      .filter(s => s.shortForm)
      .map(s => `<li><strong>${esc(s.title)}:</strong> ${highlight(s.shortForm!, keywords)}</li>`)
      .join('')
    const dateRange = `${fmtDate(job.startDate)} – ${fmtDate(job.endDate ?? '')}`
    const meta = [job.name, job.location, dateRange].filter(Boolean).join(' · ')
    return `
      <div class="work-row">
        <div class="jobtitle">${esc(job.position)}</div>
        <div class="company-line">${esc(meta)}</div>
        ${highlights ? `<ul class="highlights">${highlights}</ul>` : ''}
        ${stories ? `
          <div class="stories-label">Success Stories / Achievements</div>
          <ul class="stories-inline">${stories}</ul>
        ` : ''}
      </div>`
  }

  const workEntryCompact = (job: NonNullable<ResumeData['work']>[number]) => {
    const stories = (job.successStories ?? [])
      .filter(s => s.shortForm)
      .map(s => `<li><strong>${esc(s.title)}:</strong> ${highlight(s.shortForm!, keywords)}</li>`)
      .join('')
    const dateRange = `${fmtDate(job.startDate)} – ${fmtDate(job.endDate ?? '')}`
    const meta = [job.name, job.location, dateRange].filter(Boolean).join(' · ')
    return `
      <div class="work-row work-row-compact">
        <div class="jobtitle">${esc(job.position)}</div>
        <div class="company-line">${esc(meta)}</div>
        ${job.summary ? `<div class="jsummary">${highlight(job.summary, keywords)}</div>` : ''}
        ${stories ? `
          <div class="stories-label">Success Stories / Achievements</div>
          <ul class="stories-inline">${stories}</ul>
        ` : ''}
      </div>`
  }

  return `<!DOCTYPE html>
<html lang="en">
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
  .role-title { font-family: 'Space Grotesk', sans-serif; font-size: 18pt; font-weight: 700; color: #0f172a; line-height: 1.2; margin-bottom: 0.4em; }
  .name { font-family: 'Space Grotesk', sans-serif; font-size: 12pt; font-weight: 400; color: #3a9eae; margin-bottom: 3px; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.05em; }
  .name strong { font-weight: 800; margin-right: 0.15em; }
  .education-header { font-size: 9pt; color: #64748b; margin-bottom: 3px; }
  .contact-line { font-size: 9pt; color: #64748b; line-height: 1.5; margin-bottom: 1px; }
  .contact-item { white-space: nowrap; }
  .contact-item + .contact-item::before { content: '  ·  '; color: #94a3b8; }
  .lang-header { font-size: 9pt; color: #64748b; line-height: 1.5; }

  /* ── Summary ── */
  .summary { font-size: 10pt; color: #334155; line-height: 1.25; margin-bottom: 0; }

  /* ── Section headers ── */
  .section-hdr { margin-top: 12px; margin-bottom: 4px; break-after: avoid; page-break-after: avoid; }
  .section-page-break { break-before: page; page-break-before: always; margin-top: 0; }
  .section-title { font-family: 'Space Grotesk', sans-serif; font-size: 11pt; font-weight: 700; color: #3a9eae; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; margin-top: 16px; }
  .section-rule { width: 100%; height: 1px; background: #cbd5e1; margin-top: 1px; }

  /* ── Core Competencies ── */
  .competencies { list-style: none; margin-top: 2px; }
  .competencies li { font-size: 10pt; color: #334155; line-height: 1.25; padding-left: 12px; position: relative; margin-bottom: 0; }
  .competencies li::before { content: '•'; position: absolute; left: 0; color: #3a9eae; }

  /* ── Work entries ── */
  .work-row { margin-bottom: 4px; page-break-inside: avoid; }
  .work-row-compact { margin-bottom: 4px; }
  .jobtitle { font-family: 'Space Grotesk', sans-serif; font-size: 10pt; font-weight: 700; color: #0f172a; }
  .company-line { font-size: 9pt; color: #64748b; margin-bottom: 1px; }
  .jsummary { font-size: 10pt; color: #334155; line-height: 1.25; margin-top: 1px; }
  .highlights { list-style: none; margin-top: 1px; }
  .highlights li { font-size: 10pt; color: #334155; line-height: 1.25; padding-left: 12px; position: relative; margin-bottom: 0; }
  .highlights li::before { content: '•'; position: absolute; left: 0; }

  /* ── Inline Success Stories ── */
  .stories-label { font-family: 'Space Grotesk', sans-serif; font-size: 10pt; font-weight: 700; color: #3a9eae; margin-top: 2px; margin-bottom: 0; }
  .stories-inline { list-style: none; }
  .stories-inline li { font-size: 10pt; color: #334155; line-height: 1.25; padding-left: 12px; position: relative; margin-bottom: 0; }
  .stories-inline li::before { content: '▸'; position: absolute; left: 0; color: #3a9eae; }

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
      <div class="role-title">${esc(basics.label ?? 'Tech Lead &amp; Senior Full Stack Engineer')}</div>
      <div class="name"><strong>${esc(basics.name.split(' ')[0]!)}</strong>${esc(basics.name.split(' ').slice(1).join(' '))}</div>
      <div class="education-header">${education?.[0] ? `${esc(education[0].studyType ?? '')} — ${esc(education[0].area ?? '')}` : ''}</div>
      <div class="contact-line">
        ${contactItem('Email', basics.email)}
        ${contactItem('Phone', basics.phone)}
      </div>
      <div class="contact-line">
        ${contactItem('Location', `${basics.location.postalCode} ${basics.location.city}, ${basics.location.region} — ${basics.location.countryCode}`)}
        ${contactItem('Web', basics.url.replace('https://', ''))}
      </div>
      <div class="contact-line">
        ${githubProfile ? contactItem('GitHub', githubProfile.url.replace('https://', '')) : ''}
        ${linkedinProfile ? contactItem('LinkedIn', linkedinProfile.url.replace('https://', '')) : ''}
      </div>
      ${languages ? `<div class="lang-header">
        <strong>Language:</strong> ${languages.filter(l => l.fluency !== 'Basic knowledge').map(l => `${esc(l.language)} ${esc(l.fluency)}`).join(' · ')}
      </div>` : ''}
    </div>
  </div>

  ${sectionHeader('SUMMARY')}
  <p class="summary">${esc(summaryPdf)}</p>

  ${coreCompetencies.length ? `
    ${sectionHeader('SKILL, KEYWORD & PROOF')}
    <ul class="competencies">
      ${coreCompetencies.map(c =>
        `<li><strong>${esc(c.requirement)}</strong> — ${highlight(c.proof, keywords)}</li>`
      ).join('')}
    </ul>
  ` : ''}

  ${sectionHeader('WORK EXPERIENCE')}
  ${currentWork.map(j => workEntry(j)).join('')}

  ${previousWork.length ? `
    ${sectionHeader('PREVIOUS WORK EXPERIENCE', true)}
    ${previousWork.map(workEntryCompact).join('')}
  ` : ''}

  ${projects && projects.length ? `
    ${sectionHeader('KEY PROJECTS')}
    ${projects.map(p => `
      <div class="project-row">
        <div class="project-name">${esc(p.name)}</div>
        <div class="project-desc">${highlight(p.description, keywords)}</div>
      </div>`).join('')}
  ` : ''}

  ${sectionHeader('TECHNICAL SKILLS')}
  ${sortedSkills.map(g => `
    <div class="skill-row">
      <span class="skill-label">${esc(g.name)}:</span>
      <span class="skill-kw-inline">${g.keywords.map(k => highlight(k, keywords)).join(', ')}</span>
    </div>`).join('')}

  ${education ? `
    ${sectionHeader('EDUCATION')}
    ${education.map(edu => `
      <div class="edu-entry">
        <div class="jobtitle">${esc(edu.institution)}</div>
        <div class="company-line">${esc([edu.studyType, edu.area].filter(Boolean).join(' · '))}</div>
        <div class="company-line">${esc([edu.startDate, edu.endDate].filter(Boolean).join(' – '))}</div>
      </div>`).join('')}
  ` : ''}

  ${interests && interests.length ? `
    ${sectionHeader('INTERESTS')}
    <div class="lang-line">
      ${interests.map(g => `<strong>${esc(g.name)}:</strong> ${g.keywords.map(k => esc(k)).join(', ')}`).join(' &nbsp;·&nbsp; ')}
    </div>
  ` : ''}
</body>
</html>`
}
