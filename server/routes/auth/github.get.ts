export default defineOAuthGitHubEventHandler({
  config: {
    scope: ['user:email']
  },
  async onSuccess(event, { user }) {
    const redirect = getCookie(event, 'auth_redirect') ?? '/'
    const safePath = redirect.startsWith('/') ? redirect : '/'
    deleteCookie(event, 'auth_redirect')

    await setUserSession(event, {
      user: {
        name: user.name || user.login,
        email: user.email ?? undefined,
        avatar: user.avatar_url,
        provider: 'github'
      }
    })

    return sendRedirect(event, safePath)
  },
  async onError(event, error) {
    console.error('[auth/github]', error)
    return sendRedirect(event, '/?auth_error=1')
  }
})
