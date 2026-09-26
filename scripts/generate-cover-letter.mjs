#!/usr/bin/env node
/**
 * Generate a cover letter PDF in the same visual style as the CV.
 *
 * Run:  node --env-file=.env scripts/generate-cover-letter.mjs
 * Output: public/giancarlo_papa_cover_letter_novu.pdf
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, rgb } from 'pdf-lib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const _require = createRequire(import.meta.url)

let avatarBase64
try {
  const buf = readFileSync(resolve(root, 'server/assets/images/avatar.jpeg'))
  avatarBase64 = `data:image/jpeg;base64,${buf.toString('base64')}`
} catch { /* avatar optional */ }

// ── Letter content ────────────────────────────────────────────────────────────

const sender = {
  name: 'Giancarlo Papa',
  role: 'Senior Full Stack Engineer',
  email: 'giancarlo.papa@gmail.com',
  phone: '+41 76 337 13 75',
  location: 'Elsau ZH, Switzerland',
  url: 'giancarlopapa.com',
  github: 'github.com/gpx75',
  linkedin: 'linkedin.com/in/gpapa'
}

const today = new Date().toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })

const recipient = {
  company: 'novu',
  role: 'Senior Full Stack Developer (Laravel/Symfony, Vue.js)',
  location: 'Zürich, Switzerland'
}

const body = [
  `I am writing to express my interest in the Senior Full Stack Developer position at ${recipient.company}. Based in Elsau, just outside Zürich, I bring 25 years of hands-on PHP development with deep expertise in Laravel, Vue.js, and modern full-stack architectures — precisely the combination your team is looking for.`,

  `Over the past 13+ years at Sunrise Communications AG, I have owned and delivered complex, business-critical applications from architecture to production. My most relevant project is AMP (Application Management Portal) — a full-stack call centre productivity suite built entirely with Laravel, Vue.js, Oracle, MySQL, Redis, and Elasticsearch, running on FrankenPHP/Docker/GCP. Beyond Laravel, I have solid Symfony experience and have worked with headless CMS platforms including Craft CMS, Statamic, and WordPress across both agency-style and enterprise environments.`,

  `What attracts me to novu is the combination of technical depth and design-conscious craft. I take user experience seriously — not as an afterthought, but as a core engineering responsibility. My work spans both backend API design and clean, component-driven Vue.js interfaces, and I consider the two inseparable. I am equally comfortable owning an entire feature end-to-end as I am collaborating closely within a team.`,

  `I am based in eastern Canton Zürich and available for regular office attendance in Zürich. I speak fluent German at business level and am equally comfortable working in English.`,

  `I would welcome the opportunity to discuss how my background aligns with your needs. My full resume and skill matrix are available at giancarlopapa.com.`
]

// ── HTML builder ───────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const icons = {
  mail: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  phone: `<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.6 4.4 2 2 0 0 1 3.58 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l1.99-1.99a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  pin: `<svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  globe: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>`,
  github: `<svg viewBox="0 0 24 24"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6.3-1.5 6.3-7a5.5 5.5 0 0 0-1.5-3.8 5.1 5.1 0 0 0-.1-3.8s-1.2-.4-4 1.5a13.4 13.4 0 0 0-7 0C5.4 0 4.3.5 4.3.5a5.1 5.1 0 0 0-.2 3.8A5.5 5.5 0 0 0 2.5 8c0 5.4 3.3 6.7 6.3 7a3.7 3.7 0 0 0-1 2.3V22"/><path d="M9 18c-5 1.5-5-2.5-7-3"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`
}

const ibadge = (svg) =>
  `<span class="ibadge"><span class="isvg">${svg}</span></span>`

const contactRow = (svg, text) =>
  `<div class="contact-row">${ibadge(svg)}<span>${esc(text)}</span></div>`

function buildHtml(avatar) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:ital,wght@0,400;0,700;1,400&display=swap');
  @page { size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { height: auto; }
  body { font-family: 'JetBrains Mono','Courier New',Courier,monospace; font-size: 9pt; color: #1a1a2e; line-height: 1.5; background: white; }
  .accent-bar { height: 3px; background: linear-gradient(90deg, #2a7a8a 0%, #3a9eae 100%); margin-bottom: 20px; border-radius: 1px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .hdr-left { flex: 1; min-width: 0; }
  .name { font-family: 'Space Grotesk', sans-serif; font-size: 22pt; font-weight: 700; color: #0f172a; line-height: 1.05; letter-spacing: -0.3px; margin-bottom: 4px; }
  .subtitle { font-size: 10pt; font-style: italic; color: #64748b; margin-bottom: 10px; line-height: 1.25; }
  .contact-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 10px; }
  .contact-row { display: flex; align-items: center; gap: 6px; font-size: 8pt; color: #64748b; margin-bottom: 3px; }
  .ibadge { display: inline-flex; align-items: center; justify-content: center; width: 19px; height: 19px; min-width: 19px; border-radius: 50%; border: 1px solid #3a9eae; color: #3a9eae; }
  .isvg { display: flex; align-items: center; justify-content: center; width: 10px; height: 10px; }
  .isvg svg { width: 10px; height: 10px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .avatar { width: 90px; height: 90px; min-width: 90px; border-radius: 50%; overflow: hidden; margin-left: 14px; flex-shrink: 0; border: 2px solid #e2e8f0; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .divider { height: 1px; background: #e2e8f0; margin: 18px 0; }
  .meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 18px; }
  .date { font-size: 8.5pt; color: #64748b; }
  .re { font-size: 8.5pt; color: #64748b; text-align: right; }
  .re strong { color: #3a9eae; font-family: 'Space Grotesk', sans-serif; }
  .salutation { font-size: 9.5pt; font-weight: 700; font-family: 'Space Grotesk', sans-serif; color: #0f172a; margin-bottom: 14px; }
  .body-para { font-size: 9pt; color: #334155; line-height: 1.65; margin-bottom: 12px; }
  .closing { margin-top: 20px; }
  .closing-text { font-size: 9pt; color: #334155; margin-bottom: 28px; }
  .sig-name { font-family: 'Space Grotesk', sans-serif; font-size: 12pt; font-weight: 700; color: #0f172a; }
  .sig-role { font-size: 8.5pt; color: #3a9eae; margin-top: 2px; }
</style>
</head>
<body>
  <div class="accent-bar"></div>

  <div class="header">
    <div class="hdr-left">
      <div class="name">${esc(sender.name.toUpperCase())}</div>
      <div class="subtitle">${esc(sender.role)}</div>
      <div class="contact-grid">
        ${contactRow(icons.mail, sender.email)}
        ${contactRow(icons.phone, sender.phone)}
        ${contactRow(icons.pin, sender.location)}
        ${contactRow(icons.globe, sender.url)}
        ${contactRow(icons.github, sender.github)}
        ${contactRow(icons.linkedin, sender.linkedin)}
      </div>
    </div>
    ${avatar ? `<div class="avatar"><img src="${avatar}" alt=""></div>` : ''}
  </div>

  <div class="divider"></div>

  <div class="meta">
    <div class="date">${esc(today)}</div>
    <div class="re">
      Re: <strong>${esc(recipient.role)}</strong><br>
      ${esc(recipient.company)} &mdash; ${esc(recipient.location)}
    </div>
  </div>

  <div class="salutation">Dear ${esc(recipient.company)} Hiring Team,</div>

  ${body.map(p => `<p class="body-para">${esc(p)}</p>`).join('\n  ')}

  <div class="closing">
    <p class="closing-text">Kind regards,</p>
    <div class="sig-name">${esc(sender.name)}</div>
    <div class="sig-role">${esc(sender.role)}</div>
  </div>
</body>
</html>`
}

// ── Puppeteer ──────────────────────────────────────────────────────────────────

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

if (!existsSync(executablePath)) {
  console.error(`✗ Chrome not found at: ${executablePath}`)
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
  const html = buildHtml(avatarBase64)

  console.log('→ Rendering cover letter…')
  await page.setContent(html, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)

  const rawPdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', right: '18mm', bottom: '18mm', left: '18mm' }
  })

  // Border frame via pdf-lib (same as CV)
  const pdfDoc = await PDFDocument.load(rawPdf)
  const borderWidth = 4 * 72 / 25.4
  const borderInset = borderWidth / 2
  const borderColor = rgb(58 / 255, 158 / 255, 174 / 255)
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

  const outPath = resolve(root, 'public/giancarlo_papa_cover_letter_novu.pdf')
  writeFileSync(outPath, Buffer.from(pdf))
  console.log(`✓ Cover letter written to public/giancarlo_papa_cover_letter_novu.pdf (${(pdf.length / 1024).toFixed(0)} KB)`)
} finally {
  await browser.close()
}
