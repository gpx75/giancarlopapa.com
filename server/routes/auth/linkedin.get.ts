export default defineOAuthLinkedInEventHandler({
  config: {
    scope: ['openid', 'profile', 'email']
  },
  async onSuccess(event, { user }) {
    return finalizeOAuthLogin(event, {
      name: user.name || [user.given_name, user.family_name].filter(Boolean).join(' '),
      email: user.email,
      avatar: user.picture,
      provider: 'linkedin'
    })
  },
  async onError(event, error) {
    return handleOAuthError(event, 'linkedin', error)
  }
})
