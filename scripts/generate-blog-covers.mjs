#!/usr/bin/env node
/**
 * Generate terminal-style cover images for the blog posts.
 *
 * Run manually:  node --env-file=.env scripts/generate-blog-covers.mjs
 * Auto-runs via the husky pre-commit hook when a blog post is staged.
 *
 * Output: public/images/blog/<slug>.png (1200×630, also used as og:image).
 * Each post references its cover with `image: /images/blog/<slug>.png`.
 *
 * Requires CHROMIUM_EXECUTABLE_PATH in .env (or environment) pointing to
 * a local Chrome/Chromium binary.
 */

import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const blogDir = `${root}/content/blog`
const outDir = `${root}/public/images/blog`

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
if (!executablePath) {
  console.error('CHROMIUM_EXECUTABLE_PATH is not set.')
  process.exit(1)
}

// Single-line `key: 'value'` frontmatter fields are all the cover needs.
// Only the frontmatter block is searched, never the post body.
function frontmatterField(source, key) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(['"]?)(.*)\\1\\s*$`, 'm'))
  // YAML single-quoted strings escape a quote as ''.
  return match?.[1] === "'" ? match[2].replaceAll("''", "'") : (match?.[2] ?? '')
}

const escapeHtml = (value) =>
  value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function coverHtml({ slug, title, date }) {
  // "Title: Subtitle" renders on two lines, as on the post page.
  const i = title.indexOf(': ')
  const [main, sub] = i === -1 ? [title, ''] : [title.slice(0, i + 1), title.slice(i + 2)]
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  })

  return `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@700&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #282a36; color: #eff0eb;
         font-family: 'JetBrains Mono', monospace; padding: 72px 80px;
         display: flex; flex-direction: column; justify-content: space-between;
         border-top: 12px solid #ff6ac1; }
  .prompt { font-size: 28px; color: #97979b; }
  .prompt .dollar { color: #5af78e; margin-right: 16px; }
  h1 { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 72px; line-height: 1.08; }
  h2 { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 44px; line-height: 1.2; color: #9aedfe; margin-top: 20px; }
  .footer { display: flex; justify-content: space-between; font-size: 26px; color: #97979b; }
  .footer .site { color: #eff0eb; }
  .cursor { color: #5af78e; }
</style></head>
<body>
  <p class="prompt"><span class="dollar">$</span>cat ~/blog/${escapeHtml(slug)}.md</p>
  <div>
    <h1>${escapeHtml(main)}</h1>
    ${sub ? `<h2>${escapeHtml(sub)}</h2>` : ''}
  </div>
  <div class="footer">
    <span>// ${escapeHtml(formattedDate)}</span>
    <span class="site">giancarlopapa.com<span class="cursor">▌</span></span>
  </div>
</body></html>`
}

mkdirSync(outDir, { recursive: true })
const browser = await puppeteer.launch({ executablePath, headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 630 })

for (const file of readdirSync(blogDir).filter((f) => f.endsWith('.md'))) {
  const source = readFileSync(`${blogDir}/${file}`, 'utf8')
  const slug = basename(file, '.md')
  const html = coverHtml({
    slug,
    title: frontmatterField(source, 'title'),
    date: frontmatterField(source, 'date')
  })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${outDir}/${slug}.png` })
  console.log(`✓ public/images/blog/${slug}.png`)
}

await browser.close()
