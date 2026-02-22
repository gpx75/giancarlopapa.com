export function useAuth() {
  const { user, loggedIn, clear } = useUserSession()
  const route = useRoute()

  function login(provider: 'github' | 'google' | 'linkedin') {
    useCookie('auth_redirect').value = route.fullPath
    return navigateTo(`/auth/${provider}`, { external: true })
  }

  async function logout() {
    await clear()
    return navigateTo('/')
  }

  return { user, loggedIn, login, logout }
}
