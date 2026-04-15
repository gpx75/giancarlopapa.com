import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let cachedResumeText: string | null = null;

export function getResumeForPrompt(): string {
  if (cachedResumeText) return cachedResumeText;

  const resumePath = resolve(process.cwd(), 'content/giancarlo_papa_resume.json');
  const raw = JSON.parse(readFileSync(resumePath, 'utf-8'));

  const lines: string[] = [];

  // Basics
  const b = raw.basics;
  lines.push(`# ${b.name}`);
  lines.push(`${b.label}`);
  lines.push(`Location: ${b.location?.city}, ${b.location?.region}, ${b.location?.countryCode}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(b.summary);
  lines.push('');

  // Core competencies
  if (b.coreCompetencies?.length) {
    lines.push('## Core Competencies');
    for (const c of b.coreCompetencies) {
      lines.push(`- ${c.requirement}: ${c.proof}`);
    }
    lines.push('');
  }

  // Work experience
  if (raw.work?.length) {
    lines.push('## Work Experience');
    for (const w of raw.work) {
      lines.push(`### ${w.position} at ${w.name} (${w.startDate}–${w.endDate || 'Present'})`);
      lines.push(`Location: ${w.location}`);
      if (w.summary) lines.push(w.summary);
      if (w.highlights?.length) {
        for (const h of w.highlights) {
          lines.push(`- ${h}`);
        }
      }
      lines.push('');
    }
  }

  // Skills
  if (raw.skills?.length) {
    lines.push('## Skills');
    for (const s of raw.skills) {
      const level = s.level ? ` (${s.level})` : '';
      lines.push(`### ${s.name}${level}`);
      lines.push(s.keywords?.join(', ') ?? '');
      lines.push('');
    }
  }

  // Education
  if (raw.education?.length) {
    lines.push('## Education');
    for (const e of raw.education) {
      lines.push(`- ${e.studyType} ${e.area}, ${e.institution} (${e.startDate}–${e.endDate})`);
    }
    lines.push('');
  }

  // Languages
  if (raw.languages?.length) {
    lines.push('## Languages');
    for (const l of raw.languages) {
      lines.push(`- ${l.language}: ${l.fluency}`);
    }
    lines.push('');
  }

  // Projects
  if (raw.projects?.length) {
    lines.push('## Projects');
    for (const p of raw.projects) {
      const stack = Array.isArray(p.stack) ? p.stack.join(', ') : (p.stack ?? '');
      lines.push(`- ${p.name}: ${p.description} (${stack})`);
    }
    lines.push('');
  }

  cachedResumeText = lines.join('\n');
  return cachedResumeText;
}
