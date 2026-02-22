export default defineOAuthLinkedInEventHandler({
  config: {
    scope: ['openid', 'profile', 'email']
  },
  async onSuccess(event, { user }) {
    const redirect = getCookie(event, 'auth_redirect') ?? '/'
    const safePath = redirect.startsWith('/') ? redirect : '/'
    deleteCookie(event, 'auth_redirect')

    await setUserSession(event, {
      user: {
        name: user.name || [user.given_name, user.family_name].filter(Boolean).join(' '),
        email: user.email,
        avatar: user.picture,
        provider: 'linkedin'
      }
    })

    return sendRedirect(event, safePath)
  },
  async onError(event, error) {
    console.error('[auth/linkedin]', error)
    return sendRedirect(event, '/?auth_error=1')
  }
})
