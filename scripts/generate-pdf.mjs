#!/usr/bin/env node
/**
 * Generate a static PDF resume from content/giancarlo_papa_resume.json.
 *
 * Run manually:  node --env-file=.env scripts/generate-pdf.mjs
 * Auto-runs via the husky pre-commit hook when the JSON resume is staged.
 *
 * Output: public/giancarlo_papa_resume.pdf
 *
 * Requires CHROMIUM_EXECUTABLE_PATH in .env (or environment) pointing to
 * a local Chrome/Chromium binary.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, rgb } from 'pdf-lib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const _require = createRequire(import.meta.url)

// ── Resume data ───────────────────────────────────────────────────────────────

const resume = JSON.parse(
  readFileSync(resolve(root, 'content/giancarlo_papa_resume.json'), 'utf-8')
)

let avatarBase64
try {
  const buf = readFileSync(resolve(root, 'public/giancarlopapa.jpeg'))
  avatarBase64 = `data:image/jpeg;base64,${buf.toString('base64')}`
}
catch { /* avatar optional */ }

// ── HTML builder ──────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d || d.toLowerCase() === 'present') return 'Present'
  const parts = d.split('-')
  const y = parts[0] ?? d
  const m = parts[1]
  if (!m) return y
  return new Date(Number(y), Number(m) - 1)
    .toLocaleDateString('en', { month: 'short', year: 'numeric' })
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildResumeHtml(avatar) {
  const { basics, work, skills, languages, education, interests, projects } = resume
  const coreCompetencies = basics.coreCompetencies ?? []
  const summaryPdf = basics.summaryPdf ?? basics.summary

  // All work entries on page 1
  const allWork = work ?? []

  const contactItem = (label, text) =>
    `<span class="contact-item"><strong>${label}:</strong> ${esc(text)}</span>`

  const sectionHeader = (title, newPage = false) => `
    <div class="section-hdr${newPage ? ' section-page-break' : ''}">
      <div class="section-title">${esc(title)}</div>
      <div class="section-rule"></div>
    </div>`

  // Work entry with inline success stories (shortForm)
  const workEntry = (job, maxHighlights = 4) => {
    const highlights = (job.highlights ?? []).slice(0, maxHighlights).map(h => `<li>${esc(h)}</li>`).join('')
    const stories = (job.successStories ?? [])
      .filter(s => s.shortForm)
      .map(s => `<li><strong>${esc(s.title)}:</strong> ${esc(s.shortForm)}</li>`)
      .join('')
    const dateRange = `${fmtDate(job.startDate)} – ${fmtDate(job.endDate)}`
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

  // Compact work entry (previous roles — summary + success stories, no highlights)
  const workEntryCompact = (job) => {
    const stories = (job.successStories ?? [])
      .filter(s => s.shortForm)
      .map(s => `<li><strong>${esc(s.title)}:</strong> ${esc(s.shortForm)}</li>`)
      .join('')
    const dateRange = `${fmtDate(job.startDate)} – ${fmtDate(job.endDate)}`
    const meta = [job.name, job.location, dateRange].filter(Boolean).join(' · ')
    return `
      <div class="work-row work-row-compact">
        <div class="jobtitle">${esc(job.position)}</div>
        <div class="company-line">${esc(meta)}</div>
        ${job.summary ? `<div class="jsummary">${esc(job.summary)}</div>` : ''}
        ${stories ? `
          <div class="stories-label">Success Stories / Achievements</div>
          <ul class="stories-inline">${stories}</ul>
        ` : ''}
      </div>`
  }

  const githubProfile = basics.profiles.find(p => p.network === 'GitHub')
  const linkedinProfile = basics.profiles.find(p => p.network === 'LinkedIn')

  // Split work into current and previous
  const currentWork = allWork.filter(j => !j.endDate || j.endDate === '')
  const previousWork = allWork.filter(j => j.endDate && j.endDate !== '')

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
  .avatar { width: 100px; height: 100px; min-width: 100px; border-radius: 50%; overflow: hidden; margin-left: 14px; flex-shrink: 0; border: 2px solid #e2e8f0; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }

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
  .interest-kw li::before { content: '•'; position: absolute; left: 0; color: #3a9eae; }

  /* ── Accent bar ── */
  .accent-bar { height: 3px; background: linear-gradient(90deg, #2a7a8a 0%, #3a9eae 100%); margin-bottom: 10px; border-radius: 1px; }
</style>
</head>
<body>
  <div class="accent-bar"></div>

  <!-- PAGE 1 ─────────────────────────────────────────────── -->

  <div class="header">
    <div class="hdr-left">
      <div class="role-title">Tech Lead &amp; Senior Full Stack Engineer</div>
      <div class="name"><strong>${esc(basics.name.split(' ')[0])}</strong>${esc(basics.name.split(' ').slice(1).join(''))}</div>
      <div class="education-header">${education[0] ? `${esc(education[0].studyType)} — ${esc(education[0].area)}` : ''}</div>
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
      <div class="lang-header">
        <strong>Language:</strong> ${languages.filter(l => l.fluency !== 'Basic knowledge').map(l => `${esc(l.language)} ${esc(l.fluency)}`).join(' · ')}
      </div>
    </div>
    ${avatar ? `<div class="avatar"><img src="${avatar}" alt=""></div>` : ''}
  </div>

  ${sectionHeader('SUMMARY')}
  <p class="summary">${esc(summaryPdf)}</p>

  ${coreCompetencies.length ? `
    ${sectionHeader('SKILL, KEYWORD & PROOF')}
    <ul class="competencies">
      ${coreCompetencies.map(c =>
        `<li><strong>${esc(c.requirement)}</strong> — ${esc(c.proof)}</li>`
      ).join('')}
    </ul>
  ` : ''}

  ${sectionHeader('WORK EXPERIENCE')}
  ${currentWork.map(j => workEntry(j)).join('')}

  ${previousWork.length ? `
    ${sectionHeader('PREVIOUS WORK EXPERIENCE', true)}
    ${previousWork.map(workEntryCompact).join('')}
  ` : ''}

  <!-- PAGE 2 ─────────────────────────────────────────────── -->

  ${projects && projects.length ? `
    ${sectionHeader('KEY PROJECTS')}
    ${projects.map(p => `
      <div class="project-row">
        <div class="project-name">${esc(p.name)}</div>
        <div class="project-desc">${esc(p.description)}</div>
      </div>`).join('')}
  ` : ''}

  ${sectionHeader('TECHNICAL SKILLS')}
  ${skills.map(g => `
    <div class="skill-row">
      <span class="skill-label">${esc(g.name)}:</span>
      <span class="skill-kw-inline">${g.keywords.map(k => esc(k)).join(', ')}</span>
    </div>`).join('')}

  ${sectionHeader('EDUCATION')}
  ${education.map(edu => `
    <div class="edu-entry">
      <div class="jobtitle">${esc(edu.institution)}</div>
      <div class="company">${esc([edu.studyType, edu.area].filter(Boolean).join(' · '))}</div>
      <div class="wloc">${esc([edu.startDate, edu.endDate].filter(Boolean).join(' – '))}</div>
    </div>`).join('')}

  ${interests && interests.length ? `
    ${sectionHeader('INTERESTS')}
    <div class="lang-line">
      ${interests.map(g => `<strong>${esc(g.name)}:</strong> ${g.keywords.map(k => esc(k)).join(', ')}`).join(' &nbsp;·&nbsp; ')}
    </div>
  ` : ''}
</body>
</html>`
}

// ── Puppeteer ─────────────────────────────────────────────────────────────────

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

if (!existsSync(executablePath)) {
  console.error(`✗ Chrome not found at: ${executablePath}`)
  console.error('  Set CHROMIUM_EXECUTABLE_PATH in .env to your Chrome binary.')
  process.exit(1)
}

const puppeteer = _require('puppeteer-core')

console.log('→ Launching Chrome…')
const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  executablePath,
  headless: true
})

try {
  const page = await browser.newPage()
  await page.emulateMediaType('print')
  const html = buildResumeHtml(avatarBase64)

  console.log('→ Rendering resume HTML…')
  await page.setContent(html, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)

  const rawPdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
  })

  // ── Draw passepartout border on every page via pdf-lib ─────────────────────
  const pdfDoc = await PDFDocument.load(rawPdf)
  const borderWidth = 4 * 72 / 25.4  // 4mm in pt ≈ 11.34pt
  const borderInset = borderWidth / 2  // center stroke on page edge → outer edge flush with page
  const borderColor = rgb(58 / 255, 158 / 255, 174 / 255)  // #3a9eae
  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize()
    page.drawRectangle({
      x: borderInset,
      y: borderInset,
      width: width - borderInset * 2,
      height: height - borderInset * 2,
      borderColor,
      borderWidth,
      color: undefined
    })
  }
  const pdf = await pdfDoc.save()

  const outPath = resolve(root, 'public/giancarlo_papa_resume.pdf')
  writeFileSync(outPath, Buffer.from(pdf))
  console.log(`✓ PDF written to public/giancarlo_papa_resume.pdf (${(pdf.length / 1024).toFixed(0)} KB)`)
}
finally {
  await browser.close()
}
