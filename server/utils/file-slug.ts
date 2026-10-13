/**
 * ASCII-only slug for download/attachment filenames — a raw "ü" in a
 * Content-Disposition header arrives garbled ("z�rcher").
 */
export function fileSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
