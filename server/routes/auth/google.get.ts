export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['openid', 'profile', 'email']
  },
  async onSuccess(event, { user }) {
    return finalizeOAuthLogin(event, {
      name: user.name,
      email: user.email,
      avatar: user.picture,
      provider: 'google'
    })
  },
  async onError(event, error) {
    return handleOAuthError(event, 'google', error)
  }
})
