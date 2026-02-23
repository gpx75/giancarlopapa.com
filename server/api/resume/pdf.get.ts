import resumeJson from '../../../content/giancarlo_papa_resume.json'

// The chromium binary is downloaded at runtime from GitHub releases.
// On Vercel this happens once per Lambda container and is cached in /tmp.
// For local dev, set CHROMIUM_EXECUTABLE_PATH to your local Chrome binary.
const CHROMIUM_RELEASE = 'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

function fmtDate(d: string): string {
  if (!d || d.toLowerCase() === 'present') return 'Present'
  const parts = d.split('-')
  const y = parts[0] ?? d
  const m = parts[1]
  if (!m) return y
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' })
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildResumeHtml(avatarBase64: string | undefined): string {
  const { basics, work, skills, languages, education } = resumeJson
  const interests = resumeWithInterests.interests

  const recentWork = work.filter(j => j.endDate === 'Present' || Number(j.startDate.split('-')[0]) >= 2012)
  const earlyWork = work.filter(j => j.endDate !== 'Present' && Number(j.startDate.split('-')[0]) < 2012)

  const icons = {
    mail: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    phone: `<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.6 4.4 2 2 0 0 1 3.58 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l1.99-1.99a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    pin: `<svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    globe: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>`,
    github: `<svg viewBox="0 0 24 24"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6.3-1.5 6.3-7a5.5 5.5 0 0 0-1.5-3.8 5.1 5.1 0 0 0-.1-3.8s-1.2-.4-4 1.5a13.4 13.4 0 0 0-7 0C5.4 0 4.3.5 4.3.5a5.1 5.1 0 0 0-.2 3.8A5.5 5.5 0 0 0 2.5 8c0 5.4 3.3 6.7 6.3 7a3.7 3.7 0 0 0-1 2.3V22"/><path d="M9 18c-5 1.5-5-2.5-7-3"/></svg>`,
    linkedin: `<svg viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`,
    briefcase: `<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    star: `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    wrench: `<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    grad: `<svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
    hobby: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    code: `<svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    cloud: `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,
    cpu: `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M20 15h2M9 2v2M9 20v2M2 9h2M20 9h2"/></svg>`,
    building: `<svg viewBox="0 0 24 24"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
    database: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    server: `<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`
  }

  const skillIcons: Record<string, string> = {
    'Core Engineering': icons.code,
    'Cloud & Platform': icons.cloud,
    'AI & Data Engineering': icons.cpu,
    'Salesforce & Enterprise': icons.building,
    'Databases & Storage': icons.database,
    'DevOps & Networking': icons.server
  }

  function iconBadge(svg: string) {
    return `<span class="ibadge"><span class="isvg">${svg}</span></span>`
  }

  function contactRow(svg: string, text: string) {
    return `<div class="contact-row">${iconBadge(svg)}<span>${escHtml(text)}</span></div>`
  }

  function sectionHeader(title: string, svg: string, newPage = false) {
    return `
      <div class="section-hdr${newPage ? ' section-page-break' : ''}">
        <div class="section-title">${iconBadge(svg)} ${escHtml(title)}</div>
        <div class="section-rule"></div>
      </div>`
  }

  function workEntry(job: typeof work[0]) {
    const highlights = (job.highlights ?? []).map(h => `<li>${escHtml(h)}</li>`).join('')
    return `
      <div class="work-row">
        <div class="wdate">
          <div>${escHtml(fmtDate(job.startDate))} –</div>
          <div>${escHtml(fmtDate(job.endDate))}</div>
          <div class="wloc">${escHtml(job.location ?? '')}</div>
        </div>
        <div class="wcontent">
          <div class="jobtitle">${escHtml(job.position)}</div>
          <div class="company">${escHtml(job.name)}</div>
          ${job.summary ? `<p class="jsummary">${escHtml(job.summary)}</p>` : ''}
          ${highlights ? `<ul class="highlights">${highlights}</ul>` : ''}
        </div>
      </div>`
  }

  const githubProfile = basics.profiles.find(p => p.network === 'GitHub')
  const linkedinProfile = basics.profiles.find(p => p.network === 'LinkedIn')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:ital,wght@0,400;0,700;1,400&display=swap');
  @page { size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'JetBrains Mono', 'Courier New', Courier, monospace; font-size: 9pt; color: #1a1a2e; line-height: 1.4; background: white; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .hdr-left { flex: 1; min-width: 0; }
  .name { font-family: 'Space Grotesk', sans-serif; font-size: 24pt; font-weight: 700; color: #0f172a; line-height: 1.05; letter-spacing: -0.3px; margin-bottom: 5px; }
  .subtitle { font-size: 11pt; font-style: italic; color: #64748b; margin-bottom: 10px; line-height: 1.25; }
  .contact-row { display: flex; align-items: center; gap: 6px; font-size: 8pt; color: #64748b; margin-bottom: 3px; }
  .ibadge { display: inline-flex; align-items: center; justify-content: center; width: 21px; height: 21px; min-width: 21px; border-radius: 50%; border: 1px solid #3a9eae; color: #3a9eae; }
  .isvg { display: flex; align-items: center; justify-content: center; width: 11px; height: 11px; }
  .isvg svg { width: 11px; height: 11px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .avatar { width: 100px; height: 100px; min-width: 100px; border-radius: 50%; overflow: hidden; margin-left: 14px; flex-shrink: 0; border: 2px solid #e2e8f0; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .summary { font-size: 8.5pt; color: #334155; line-height: 1.5; margin-bottom: 4px; }
  .section-hdr { margin-top: 22px; margin-bottom: 7px; break-after: avoid; page-break-after: avoid; }
  .section-page-break { break-before: page; page-break-before: always; }
  .section-title { font-family: 'Space Grotesk', sans-serif; display: flex; align-items: center; gap: 6px; font-size: 12pt; font-weight: 700; color: #3a9eae; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 3px; }
  .section-rule { width: 40px; height: 3px; background: #3a9eae; border-radius: 1px; margin-top: 4px; }
  .work-row { display: flex; gap: 12px; margin-bottom: 11px; page-break-inside: avoid; }
  .wdate { width: 92px; min-width: 92px; font-size: 8pt; color: #1a1a2e; line-height: 1.5; }
  .wloc { font-size: 7.5pt; color: #64748b; margin-top: 2px; }
  .wcontent { flex: 1; min-width: 0; }
  .jobtitle { font-family: 'Space Grotesk', sans-serif; font-size: 9.5pt; font-weight: 700; color: #0f172a; }
  .company { font-size: 8pt; color: #64748b; margin-bottom: 2px; }
  .jsummary { font-size: 8.5pt; color: #334155; line-height: 1.45; margin-top: 4px; margin-bottom: 2px; }
  .highlights { list-style: none; margin-top: 2px; }
  .highlights li { font-size: 8.5pt; color: #334155; line-height: 1.45; padding-left: 13px; position: relative; margin-bottom: 1px; }
  .highlights li::before { content: '–'; position: absolute; left: 0; }
  .skills-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 14px; }
  .skill-group { margin-bottom: 8px; page-break-inside: avoid; }
  .skill-title { font-family: 'Space Grotesk', sans-serif; display: flex; align-items: center; gap: 5px; font-size: 9pt; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
  .skill-kw { list-style: none; }
  .skill-kw li { font-size: 8.5pt; color: #334155; padding-left: 13px; position: relative; margin-bottom: 1px; line-height: 1.4; }
  .skill-kw li::before { content: '–'; position: absolute; left: 0; color: #3a9eae; }
  .interests-grid { display: flex; flex-wrap: wrap; gap: 8px 16px; }
  .interest-group { flex: 1; min-width: 120px; margin-bottom: 6px; page-break-inside: avoid; }
  .interest-title { font-family: 'Space Grotesk', sans-serif; font-size: 9pt; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
  .interest-kw { list-style: none; }
  .interest-kw li { font-size: 8.5pt; color: #334155; padding-left: 13px; position: relative; margin-bottom: 1px; line-height: 1.4; }
  .interest-kw li::before { content: '•'; position: absolute; left: 0; color: #3a9eae; }
  .lang-line { font-size: 8.5pt; color: #334155; line-height: 1.5; }
  .edu-entry { margin-bottom: 8px; page-break-inside: avoid; }
  .accent-bar { height: 3px; background: linear-gradient(90deg, #2a7a8a 0%, #3a9eae 100%); margin-bottom: 20px; border-radius: 1px; }
</style>
</head>
<body>
  <div class="accent-bar"></div>
  <div class="header">
    <div class="hdr-left">
      <div class="name">${escHtml(basics.name.toUpperCase())}</div>
      <div class="subtitle">${escHtml(basics.label)}</div>
      ${contactRow(icons.mail, basics.email)}
      ${contactRow(icons.phone, basics.phone)}
      ${contactRow(icons.pin, `${basics.location.city} ${basics.location.region}, ${basics.location.countryCode} · ${basics.location.address}, ${basics.location.postalCode} ${basics.location.city} ${basics.location.region}`)}
      ${contactRow(icons.globe, basics.url.replace('https://', ''))}
      ${githubProfile ? contactRow(icons.github, githubProfile.url.replace('https://', '')) : ''}
      ${linkedinProfile ? contactRow(icons.linkedin, linkedinProfile.url.replace('https://', '')) : ''}
    </div>
    ${avatarBase64 ? `<div class="avatar"><img src="${avatarBase64}" alt=""></div>` : ''}
  </div>

  <p class="summary">${escHtml(basics.summary)}</p>

  ${sectionHeader('PROFESSIONAL EXPERIENCE', icons.briefcase)}
  ${recentWork.map(workEntry).join('')}

  ${earlyWork.length ? `
    ${sectionHeader('EARLY CAREER & FOUNDATION (Pre-2012)', icons.star)}
    ${earlyWork.map(workEntry).join('')}
  ` : ''}

  ${sectionHeader('TECHNICAL SKILLS', icons.wrench, true)}
  <div class="skills-grid">
    ${skills.map(g => `
      <div class="skill-group">
        <div class="skill-title">${escHtml(g.name)}</div>
        <ul class="skill-kw">
          ${g.keywords.map(k => `<li>${escHtml(k)}</li>`).join('')}
        </ul>
      </div>`).join('')}
  </div>

  ${sectionHeader('LANGUAGES', icons.globe)}
  <div class="lang-line">
    ${languages.map((l, i) =>
      `<strong>${escHtml(l.language)}</strong> (— ${escHtml(l.fluency)})${i < languages.length - 1 ? ' &nbsp;|&nbsp; ' : ''}`
    ).join('')}
  </div>

  ${sectionHeader('EDUCATION', icons.grad)}
  ${education.map(edu => `
    <div class="edu-entry">
      <div class="jobtitle">${escHtml(edu.institution)}</div>
      <div class="company">${escHtml([edu.studyType, edu.area].filter(Boolean).join(' · '))}</div>
      <div class="wloc">${escHtml([edu.startDate, edu.endDate].filter(Boolean).join(' – '))}</div>
    </div>`).join('')}

  ${interests && interests.length ? `
    ${sectionHeader('INTERESTS & HOBBIES', icons.hobby)}
    <div class="interests-grid">
      ${interests.map(g => `
        <div class="interest-group">
          <div class="interest-title">${escHtml(g.name)}</div>
          <ul class="interest-kw">${g.keywords.map(k => `<li>${escHtml(k)}</li>`).join('')}</ul>
        </div>`).join('')}
    </div>
  ` : ''}
</body>
</html>`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resumeWithInterests = resumeJson as typeof resumeJson & { interests?: Array<{ name: string; keywords: string[] }> }

export default defineEventHandler(async (event) => {
  // Load avatar from bundled server asset
  let avatarBase64: string | undefined
  try {
    const buf = await useStorage('assets/server').getItemRaw('images/avatar.jpeg')
    if (buf) {
      avatarBase64 = `data:image/jpeg;base64,${Buffer.from(buf as ArrayBuffer).toString('base64')}`
    }
  }
  catch { /* avatar is optional */ }

  const html = buildResumeHtml(avatarBase64)

  // Resolve Chromium executable
  const { createRequire } = await import('node:module')
  const _require = createRequire(import.meta.url)

  let executablePath: string
  if (process.env.CHROMIUM_EXECUTABLE_PATH) {
    executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
  }
  else {
    // Runtime download of Chromium binary (cached in /tmp between Lambda invocations)
    const chromium = _require('@sparticuz/chromium-min') as {
      args: string[]
      executablePath(url?: string): Promise<string>
    }
    executablePath = await chromium.executablePath(CHROMIUM_RELEASE)
  }

  const puppeteer = _require('puppeteer-core') as typeof import('puppeteer-core')
  const chromiumArgs = process.env.CHROMIUM_EXECUTABLE_PATH
    ? []
    : (_require('@sparticuz/chromium-min') as { args: string[] }).args

  const browser = await puppeteer.launch({
    args: [
      ...chromiumArgs,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ],
    executablePath,
    headless: true
  })

  try {
    const page = await browser.newPage()
    await page.emulateMediaType('print')
    await page.setContent(html, { waitUntil: 'networkidle0' })
    await page.evaluate("document.fonts.ready")

    const rawPdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '18mm', bottom: '18mm', left: '18mm' }
    })

    // ── Draw passepartout border on every page via pdf-lib ───────────────────
    const { PDFDocument, rgb } = await import('pdf-lib')
    const pdfDoc = await PDFDocument.load(rawPdf)
    const borderWidth = 4 * 72 / 25.4  // 4mm in pt ≈ 11.34pt
    const borderInset = borderWidth / 2  // center stroke on page edge → outer edge flush with page
    const borderColor = rgb(58 / 255, 158 / 255, 174 / 255) // #3a9eae
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

    setResponseHeaders(event, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="giancarlo_papa_resume.pdf"',
      'Content-Length': String(pdf.length)
    })

    return Buffer.from(pdf)
  }
  finally {
    await browser.close()
  }
})
