export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Returns true when the string looks like a syntactically valid email and
 * fits within the RFC 5321 length limit.
 */
export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_RE.test(value) && value.length <= 254
}

/**
 * Asserts that the value is a non-empty trimmed name between 2 and 100 chars.
 * Throws a 400 error with the provided message otherwise.
 */
export function assertValidName(value: unknown, message = 'Name must be between 2 and 100 characters.'): asserts value is string {
  if (typeof value !== 'string' || value.trim().length < 2 || value.length > 100) {
    throw createError({ statusCode: 400, statusMessage: message, message })
  }
}
