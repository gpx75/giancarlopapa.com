import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineEventHandler(() => {
  const path = resolve(process.cwd(), 'content/giancarlo_papa_resume.json');
  return JSON.parse(readFileSync(path, 'utf-8'));
});
