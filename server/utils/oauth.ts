import type { H3Event } from 'h3'

export type OAuthProvider = 'github' | 'google' | 'linkedin'

export interface OAuthSessionUser {
  name: string
  email?: string
  avatar?: string
  provider: OAuthProvider
}

/**
 * Shared OAuth success path: consumes the `auth_redirect` cookie, persists the
 * session, and redirects to the requested path (defaulting to `/` and
 * rejecting anything that doesn't start with `/`).
 */
export async function finalizeOAuthLogin(event: H3Event, user: OAuthSessionUser) {
  const redirect = getCookie(event, 'auth_redirect') ?? '/'
  const safePath = redirect.startsWith('/') ? redirect : '/'
  deleteCookie(event, 'auth_redirect')

  await setUserSession(event, { user })

  return sendRedirect(event, safePath)
}

/**
 * Shared OAuth error path: logs and redirects to the homepage with an error flag.
 */
export function handleOAuthError(event: H3Event, provider: OAuthProvider, error: unknown) {
  console.error(`[auth/${provider}]`, error)
  return sendRedirect(event, '/?auth_error=1')
}
