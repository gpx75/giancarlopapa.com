const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

// Module-level cache (lives for the duration of a serverless instance)
let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getStravaToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const config = useRuntimeConfig()
  const { clientId, clientSecret, refreshToken } = config.strava

  const res = await $fetch<{
    access_token: string
    expires_at: number
  }>(STRAVA_TOKEN_URL, {
    method: 'POST',
    body: {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }
  })

  cachedToken = res.access_token
  tokenExpiresAt = res.expires_at * 1000
  return cachedToken
}

export async function stravaFetch<T>(
  path: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const token = await getStravaToken()
  const url = new URL(`${STRAVA_API_BASE}${path}`)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v))
  }
  return $fetch<T>(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  })
}
