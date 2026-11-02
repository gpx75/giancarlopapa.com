/**
 * Posts new blog entries to LinkedIn.
 * Triggered by the linkedin-post.yml GitHub Action.
 *
 * Required env vars:
 *   LINKEDIN_ACCESS_TOKEN  — OAuth access token (valid 60 days)
 *   LINKEDIN_PERSON_URN    — e.g. urn:li:person:XXXXXXXX
 *   NUXT_PUBLIC_SITE_URL   — https://giancarlopapa.com
 *
 * Run `node scripts/linkedin-auth.mjs` to generate the token and URN.
 */

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SITE_URL = process.env.NUXT_PUBLIC_SITE_URL || 'https://giancarlopapa.com'
const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN
const PERSON_URN = process.env.LINKEDIN_PERSON_URN

if (!ACCESS_TOKEN) {
  console.error('LINKEDIN_ACCESS_TOKEN is not set.')
  console.error('Run `node scripts/linkedin-auth.mjs` to generate a token.')
  process.exit(1)
}

if (!PERSON_URN) {
  console.error('LINKEDIN_PERSON_URN is not set.')
  console.error('Run `node scripts/linkedin-auth.mjs` to get your person URN.')
  process.exit(1)
}

function getNewBlogPosts() {
  try {
    const output = execSync('git diff --name-only --diff-filter=A HEAD~1 HEAD', {
      encoding: 'utf-8'
    }).trim()
    return output
      .split('\n')
      .filter(f => f.startsWith('content/blog/') && f.endsWith('.md'))
  } catch {
    return []
  }
}

// Minimal frontmatter reader (the workflow runs without npm install): one-line
// `key: value` fields, inline arrays, and `key: |` literal blocks.
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const fm = {}
  const lines = match[1].split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s/.test(line)) continue
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const raw = line.slice(colonIdx + 1).trim()
    if (!key || !raw) continue
    if (raw === '|') {
      const block = []
      while (i + 1 < lines.length && (/^\s/.test(lines[i + 1]) || lines[i + 1] === '')) {
        block.push(lines[++i].replace(/^ {2}/, ''))
      }
      fm[key] = block.join('\n').trim()
      continue
    }
    if (raw.startsWith('[')) {
      try { fm[key] = JSON.parse(raw.replace(/'/g, '"')); continue } catch { /* ignore parse errors */ }
    }
    fm[key] = raw.replace(/^["']|["']$/g, '')
  }
  return fm
}

function getSlug(filepath) {
  return filepath.replace('content/blog/', '').replace(/\.md$/, '')
}

// A post's `linkedin` frontmatter text replaces the default "New post" intro.
function buildCommentary({ title, description, url, tags, linkedin }) {
  const hashtags = (tags ?? [])
    .map(t => `#${t.replace(/-/g, '')}`)
    .join(' ')
  const intro = linkedin ? [linkedin] : [`New post: ${title}`, '', description]
  return [
    ...intro,
    '',
    url,
    ...(hashtags ? ['', hashtags] : [])
  ].join('\n')
}

async function postToLinkedIn({ title, description, url, tags, linkedin }) {
  const body = {
    author: PERSON_URN,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: buildCommentary({ title, description, url, tags, linkedin }) },
        shareMediaCategory: 'ARTICLE',
        media: [{
          status: 'READY',
          description: { text: description },
          originalUrl: url,
          title: { text: title }
        }]
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
    }
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(body)
  })

  if (res.status === 401) {
    console.error('LinkedIn token has expired.')
    console.error('Re-run `node scripts/linkedin-auth.mjs` and update the LINKEDIN_ACCESS_TOKEN secret.')
    process.exit(1)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LinkedIn API ${res.status}: ${text}`)
  }

  const data = await res.json()
  const postId = data.id ?? '(unknown)'
  console.log(`Posted "${title}" — ${postId}`)
}

async function main() {
  const files = getNewBlogPosts()

  if (!files.length) {
    console.log('No new blog posts in this commit.')
    return
  }

  console.log(`Found ${files.length} new post(s): ${files.join(', ')}`)

  for (const file of files) {
    const content = readFileSync(resolve(file), 'utf-8')
    const fm = parseFrontmatter(content)

    if (fm.draft === 'true' || fm.draft === true) {
      console.log(`Skipping draft: ${file}`)
      continue
    }

    const slug = getSlug(file)
    await postToLinkedIn({
      title: fm.title || slug,
      description: fm.description || '',
      url: `${SITE_URL}/blog/${slug}`,
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      linkedin: fm.linkedin
    })
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
