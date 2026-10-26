#!/usr/bin/env node
/**
 * Generate the static PDF resume from content/giancarlo_papa_resume.json.
 *
 * Run manually:  node --env-file=.env scripts/generate-pdf.mjs
 * Auto-runs via the husky pre-commit hook when the JSON resume is staged.
 *
 * Output: server/assets/giancarlo_papa_resume.pdf (served only to signed-in
 * visitors by server/api/resume/pdf.get.ts — it contains phone and email)
 *
 * Uses the same template and two-page fitting as the tailored CVs in the
 * admin (server/utils/tailored-resume-*.ts), loaded with jiti so the public
 * PDF and the application CVs always look the same.
 *
 * Requires CHROMIUM_EXECUTABLE_PATH in .env (or environment) pointing to
 * a local Chrome/Chromium binary.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { createJiti } = createRequire(import.meta.url)('jiti')
const jiti = createJiti(`${root}/`, { alias: { '~~': root, '~': `${root}/app` } })

// The server utils rely on Nuxt auto-imports; provide them as globals.
const utils = `${root}/server/utils/`
Object.assign(globalThis, await jiti.import(`${root}/shared/utils/resume-language.ts`))
for (const mod of ['resume-i18n.ts', 'pdf-render.ts', 'tailored-resume-html.ts']) {
  Object.assign(globalThis, await jiti.import(utils + mod))
}
const { renderTailoredResumePdf, MAX_RESUME_PAGES } = await jiti.import(`${utils}tailored-resume-pdf.ts`)

const resume = JSON.parse(readFileSync(resolve(root, 'content/giancarlo_papa_resume.json'), 'utf-8'))

console.log('→ Rendering resume PDF…')
const { pdf, pages } = await renderTailoredResumePdf(resume, [], '', resume.basics.label, 'en')
if (pages > MAX_RESUME_PAGES) {
  console.warn(`⚠ Resume is ${pages} pages even at the tightest spacing (limit ${MAX_RESUME_PAGES}).`)
}

const outPath = resolve(root, 'server/assets/giancarlo_papa_resume.pdf')
writeFileSync(outPath, pdf)
console.log(`✓ PDF written to server/assets/giancarlo_papa_resume.pdf (${Math.round(pdf.length / 1024)} KB, ${pages} pages)`)
