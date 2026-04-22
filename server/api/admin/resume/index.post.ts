import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  let parsed: unknown;
  try {
    parsed = typeof body === 'string' ? JSON.parse(body) : body;
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid JSON' });
  }

  const path = resolve(process.cwd(), 'content/giancarlo_papa_resume.json');
  writeFileSync(path, JSON.stringify(parsed, null, 2), 'utf-8');

  const result = spawnSync('node', ['scripts/generate-pdf.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env },
    timeout: 60000
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.toString() ?? '';
    throw createError({
      statusCode: 500,
      message: `PDF generation failed: ${stderr}`
    });
  }

  return { ok: true };
});
