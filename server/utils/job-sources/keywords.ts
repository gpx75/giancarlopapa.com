import type Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let cachedSkillsSummary: string | null = null;

/** Build a compact skills summary from content/skills.json for AI context. */
function getSkillsSummary(): string {
  if (cachedSkillsSummary) return cachedSkillsSummary;

  try {
    const path = resolve(process.cwd(), 'content/skills.json');
    const raw = JSON.parse(readFileSync(path, 'utf-8'));
    const byLevel: Record<string, string[]> = {};

    for (const cat of raw.categories ?? []) {
      for (const s of cat.skills ?? []) {
        const lvl = s.level || 'other';
        if (!byLevel[lvl]) byLevel[lvl] = [];
        byLevel[lvl].push(s.name);
      }
    }

    const lines: string[] = [];
    for (const level of ['expert', 'advanced', 'proficient']) {
      if (byLevel[level]?.length) {
        lines.push(`${level}: ${byLevel[level].join(', ')}`);
      }
    }
    cachedSkillsSummary = lines.join('\n');
  } catch {
    cachedSkillsSummary = '';
  }

  return cachedSkillsSummary;
}

/**
 * Use AI to generate search keywords from the resume and skill matrix.
 * Returns an array of 3 short keyword strings optimized for job search.
 */
export async function generateSearchKeywords(
  anthropic: Anthropic,
  resumeText: string
): Promise<string[]> {
  const skills = getSkillsSummary();
  const context = skills ? `Resume:\n${resumeText}\n\nSkill Matrix:\n${skills}` : `Resume:\n${resumeText}`;

  const response = await callAnthropicWithRetry(anthropic, {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: context }],
    system: `Based on this resume and skill matrix, generate 3 diverse job search keyword strings (3-5 words each) that would find the best matching roles on job boards. Cover different angles: one for the primary role, one emphasizing cloud/platform skills, one for a secondary strength. Use role titles + key technologies. Do NOT include location. Return a JSON array of strings only, no markdown fences.
Example: ["Senior Full Stack Engineer Laravel", "Tech Lead Cloud Platform", "AI Engineer Python FastAPI"]`
  });

  const text = response.content.find(b => b.type === 'text');
  try {
    const parsed = JSON.parse(text?.type === 'text' ? text.text : '[]');
    return Array.isArray(parsed) ? parsed : ['Senior Full Stack Engineer'];
  } catch {
    return ['Senior Full Stack Engineer'];
  }
}
