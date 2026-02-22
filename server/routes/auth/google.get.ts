export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['openid', 'profile', 'email']
  },
  async onSuccess(event, { user }) {
    const redirect = getCookie(event, 'auth_redirect') ?? '/'
    const safePath = redirect.startsWith('/') ? redirect : '/'
    deleteCookie(event, 'auth_redirect')

    await setUserSession(event, {
      user: {
        name: user.name,
        email: user.email,
        avatar: user.picture,
        provider: 'google'
      }
    })

    return sendRedirect(event, safePath)
  },
  async onError(event, error) {
    console.error('[auth/google]', error)
    return sendRedirect(event, '/?auth_error=1')
  }
})
