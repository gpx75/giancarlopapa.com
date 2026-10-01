#!/usr/bin/env node
/**
 * Drafts translated versions of the English master resume for job
 * applications in other languages.
 *
 *   npm run translate-resume -- de fr it   # (re)draft the given languages
 *   npm run translate-resume -- --check    # report translations that are out
 *                                          # of date with the English master
 *
 * Output: content/giancarlo_papa_resume.<lang>.json — same JSON Resume shape
 * as the master, plus meta.translation { language, sourceHash, translatedAt,
 * reviewed }. Drafts are machine translations: proofread them, then set
 * "reviewed": true. The admin app flags a translation whose sourceHash no
 * longer matches the master.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const MASTER = 'content/giancarlo_papa_resume.json';
const LANGUAGES = { de: 'German (Swiss usage: "ss" instead of "ß")', fr: 'French (Swiss usage)', it: 'Italian (Swiss usage)' };
const pathFor = (lang) => `content/giancarlo_papa_resume.${lang}.json`;

const masterJson = JSON.parse(readFileSync(MASTER, 'utf8'));
// Must match resumeSourceHash() in server/utils/resume-i18n.ts.
const sourceHash = createHash('sha256').update(JSON.stringify(masterJson)).digest('hex');

const args = process.argv.slice(2);

if (args.includes('--check')) {
  for (const lang of Object.keys(LANGUAGES)) {
    if (!existsSync(pathFor(lang))) {
      console.log(`✗ ${lang}: missing — run: npm run translate-resume -- ${lang}`);
      continue;
    }
    const t = JSON.parse(readFileSync(pathFor(lang), 'utf8')).meta?.translation;
    if (t?.sourceHash !== sourceHash) {
      console.log(`⚠ ${lang}: out of date with the English master — re-run: npm run translate-resume -- ${lang}`);
    } else {
      console.log(`✓ ${lang}: up to date${t.reviewed ? '' : ' (not yet reviewed)'}`);
    }
  }
  // Warn-only: never block a commit on translations.
  process.exit(0);
}

const targets = args.filter((a) => a in LANGUAGES);
if (targets.length === 0) {
  console.error(`Usage: npm run translate-resume -- <${Object.keys(LANGUAGES).join('|')}>... | --check`);
  process.exit(1);
}

const apiKey = process.env.NUXT_ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('NUXT_ANTHROPIC_API_KEY is not set (expected in .env).');
  process.exit(1);
}
const client = new Anthropic({ apiKey });

const SYSTEM = `You translate a software engineer's CV, stored as JSON Resume, for Swiss job applications.

Return the complete JSON document with exactly the same structure: same keys, same array lengths, same order. Translate only human-readable prose values.

Do NOT translate or alter:
- JSON keys, URLs, email addresses, phone numbers, dates, postal codes, country codes
- names of people, companies, schools, products and projects (e.g. "Sunrise Communications AG", "AMP", "Jordan AI")
- technology names and technical terms recruiters search for as-is (PHP, Laravel, Vue.js, Docker, CI/CD, REST, API, DevOps, Tech Lead, Full Stack, Cloud, …)
- the "network" field of profiles

Translation style: natural, professional CV language as a native recruiter in Switzerland would write it — not word-for-word. Keep bullet points concise. Keep all facts and figures exactly; never add or drop content.

Respond with the JSON only, no markdown fences, no commentary.`;

for (const lang of targets) {
  console.log(`→ Translating to ${lang}…`);
  const resume = structuredClone(masterJson);
  delete resume.meta;

  // Streaming: the full translated resume is long output.
  const stream = client.beta.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Target language: ${LANGUAGES[lang]}\n\n${JSON.stringify(resume, null, 2)}`
      }
    ]
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
    console.error(`✗ ${lang}: stopped (${message.stop_reason}) — nothing written.`);
    process.exitCode = 1;
    continue;
  }

  const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let translated;
  try {
    translated = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''));
  } catch {
    console.error(`✗ ${lang}: response was not valid JSON — nothing written.`);
    process.exitCode = 1;
    continue;
  }

  translated.meta = {
    ...(masterJson.meta ?? {}),
    translation: {
      language: lang,
      sourceHash,
      translatedAt: new Date().toISOString(),
      reviewed: false
    }
  };
  writeFileSync(pathFor(lang), JSON.stringify(translated, null, 4) + '\n');
  console.log(`✓ ${pathFor(lang)} written — proofread it, then set meta.translation.reviewed to true.`);
}
