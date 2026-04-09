export default defineOAuthGitHubEventHandler({
  config: {
    scope: ['user:email']
  },
  async onSuccess(event, { user }) {
    return finalizeOAuthLogin(event, {
      name: user.name || user.login,
      email: user.email ?? undefined,
      avatar: user.avatar_url,
      provider: 'github'
    })
  },
  async onError(event, error) {
    return handleOAuthError(event, 'github', error)
  }
})
