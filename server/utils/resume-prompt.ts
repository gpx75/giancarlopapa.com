let cachedResumeText: string | null = null;

export async function getResumeForPrompt(): Promise<string> {
  if (cachedResumeText) return cachedResumeText;

  const storage = useStorage('assets:server');
  const raw = await storage.getItem('giancarlo_papa_resume.json') as Record<string, unknown> | null;

  if (!raw) {
    throw new Error('Could not load resume data from server assets');
  }

  const lines: string[] = [];

  // Basics
  const b = raw.basics as Record<string, unknown>;
  lines.push(`# ${b.name}`);
  lines.push(`${b.label}`);
  const loc = b.location as Record<string, string> | undefined;
  lines.push(`Location: ${loc?.city}, ${loc?.region}, ${loc?.countryCode}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(String(b.summary));
  lines.push('');

  // Core competencies
  const coreCompetencies = b.coreCompetencies as Array<Record<string, string>> | undefined;
  if (coreCompetencies?.length) {
    lines.push('## Core Competencies');
    for (const c of coreCompetencies) {
      lines.push(`- ${c.requirement}: ${c.proof}`);
    }
    lines.push('');
  }

  // Work experience
  const work = raw.work as Array<Record<string, unknown>> | undefined;
  if (work?.length) {
    lines.push('## Work Experience');
    for (const w of work) {
      lines.push(`### ${w.position} at ${w.name} (${w.startDate}–${w.endDate || 'Present'})`);
      lines.push(`Location: ${w.location}`);
      if (w.summary) lines.push(String(w.summary));
      const highlights = w.highlights as string[] | undefined;
      if (highlights?.length) {
        for (const h of highlights) {
          lines.push(`- ${h}`);
        }
      }
      lines.push('');
    }
  }

  // Skills
  const skills = raw.skills as Array<Record<string, unknown>> | undefined;
  if (skills?.length) {
    lines.push('## Skills');
    for (const s of skills) {
      const level = s.level ? ` (${s.level})` : '';
      lines.push(`### ${s.name}${level}`);
      const keywords = s.keywords as string[] | undefined;
      lines.push(keywords?.join(', ') ?? '');
      lines.push('');
    }
  }

  // Education
  const education = raw.education as Array<Record<string, string>> | undefined;
  if (education?.length) {
    lines.push('## Education');
    for (const e of education) {
      lines.push(`- ${e.studyType} ${e.area}, ${e.institution} (${e.startDate}–${e.endDate})`);
    }
    lines.push('');
  }

  // Languages
  const languages = raw.languages as Array<Record<string, string>> | undefined;
  if (languages?.length) {
    lines.push('## Languages');
    for (const l of languages) {
      lines.push(`- ${l.language}: ${l.fluency}`);
    }
    lines.push('');
  }

  // Projects
  const projects = raw.projects as Array<Record<string, unknown>> | undefined;
  if (projects?.length) {
    lines.push('## Projects');
    for (const p of projects) {
      const stack = Array.isArray(p.stack) ? p.stack.join(', ') : (p.stack ?? '');
      lines.push(`- ${p.name}: ${p.description} (${stack})`);
    }
    lines.push('');
  }

  cachedResumeText = lines.join('\n');
  return cachedResumeText;
}
