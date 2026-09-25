import type { CvEditOp, ValidatedCvEdit } from '~/types/applications';

type PathToken = string | number;

function resolvePathTokens(path: string): PathToken[] {
  // Accept both dot/bracket ("work[0].highlights") and JSON-pointer
  // ("/work/0/highlights") notation — the model doesn't always follow the
  // format asked for in the prompt.
  const normalized = path.startsWith('/') ? path.slice(1).replace(/\//g, '.') : path;
  return normalized
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((t) => (/^\d+$/.test(t) ? Number(t) : t));
}

function getAtPath(obj: unknown, tokens: PathToken[]): unknown {
  let cur = obj;
  for (const t of tokens) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<PathToken, unknown>)[t];
  }
  return cur;
}

function setAtPath(obj: unknown, tokens: PathToken[], value: unknown): void {
  let cur = obj as Record<PathToken, unknown>;
  for (let i = 0; i < tokens.length - 1; i++) {
    cur = cur[tokens[i]!] as Record<PathToken, unknown>;
  }
  cur[tokens[tokens.length - 1]!] = value;
}

/**
 * Applies AI-proposed edits to a deep clone of the resume, validating each one
 * deterministically (exact-match text search, array-shape check) rather than
 * trusting the model's output — the same function backs both the dry-run
 * preview and the real apply, so a preview can never diverge from what
 * actually gets written.
 */
export function applyCvEdits(
  baseResume: Record<string, unknown>,
  edits: CvEditOp[]
): { resume: Record<string, unknown>; results: ValidatedCvEdit[] } {
  const resume = structuredClone(baseResume);
  const results: ValidatedCvEdit[] = [];

  for (const edit of edits) {
    if (edit.op === 'manual') {
      results.push({ op: 'manual', status: 'manual', message: edit.reason });
      continue;
    }

    const tokens = resolvePathTokens(edit.path);
    if (tokens.length === 0) {
      results.push({
        op: edit.op,
        path: edit.path,
        status: 'error',
        message: 'Empty path.'
      });
      continue;
    }

    if (edit.op === 'replace') {
      const current = getAtPath(resume, tokens);
      if (typeof current !== 'string') {
        results.push({
          op: 'replace',
          path: edit.path,
          status: 'error',
          message: 'Path does not resolve to text.'
        });
        continue;
      }
      if (!edit.find) {
        results.push({
          op: 'replace',
          path: edit.path,
          status: 'error',
          message: 'Empty search text.'
        });
        continue;
      }
      const occurrences = current.split(edit.find).length - 1;
      if (occurrences !== 1) {
        results.push({
          op: 'replace',
          path: edit.path,
          status: 'error',
          message:
            occurrences === 0
              ? 'Text not found — the resume may already differ from what the AI saw.'
              : 'Text is ambiguous (appears more than once).'
        });
        continue;
      }
      const next = current.replace(edit.find, edit.replace);
      setAtPath(resume, tokens, next);
      results.push({
        op: 'replace',
        path: edit.path,
        status: 'ok',
        before: current,
        after: next
      });
    } else if (edit.op === 'insert') {
      const arr = getAtPath(resume, tokens);
      if (!Array.isArray(arr)) {
        results.push({
          op: 'insert',
          path: edit.path,
          status: 'error',
          message: 'Path does not resolve to a list.'
        });
        continue;
      }
      if (arr.length > 0 && typeof arr[0] !== typeof edit.value) {
        results.push({
          op: 'insert',
          path: edit.path,
          status: 'error',
          message: 'New item does not match the shape of existing items.'
        });
        continue;
      }

      // The tailored PDF only renders highlight bullets for the current role
      // (no endDate), and caps them at MAX_CURRENT_ROLE_HIGHLIGHTS — an
      // insert beyond that would be saved but silently invisible in the PDF.
      const isWorkHighlights =
        tokens.length === 3 &&
        tokens[0] === 'work' &&
        typeof tokens[1] === 'number' &&
        tokens[2] === 'highlights';
      if (isWorkHighlights) {
        const job = getAtPath(resume, tokens.slice(0, 2)) as
          | { endDate?: string }
          | undefined;
        if (job?.endDate) {
          results.push({
            op: 'insert',
            path: edit.path,
            status: 'error',
            message:
              'The tailored PDF only shows highlight bullets for the current role — this would be saved but invisible.'
          });
          continue;
        }
        if (arr.length >= MAX_CURRENT_ROLE_HIGHLIGHTS) {
          results.push({
            op: 'insert',
            path: edit.path,
            status: 'error',
            message: `This role already shows its ${MAX_CURRENT_ROLE_HIGHLIGHTS} visible highlights in the tailored PDF — adding another won't appear. Replace an existing one instead.`
          });
          continue;
        }
      }

      arr.push(edit.value);
      results.push({ op: 'insert', path: edit.path, status: 'ok', value: edit.value });
    }
  }

  return { resume, results };
}
