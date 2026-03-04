export default defineEventHandler(() => {
  return {
    NUXT_STRAVA_CLIENT_ID: process.env.NUXT_STRAVA_CLIENT_ID
      ? `set (${process.env.NUXT_STRAVA_CLIENT_ID.length} chars, starts: ${process.env.NUXT_STRAVA_CLIENT_ID.slice(0, 3)})`
      : 'MISSING',
    NUXT_STRAVA_CLIENT_SECRET: process.env.NUXT_STRAVA_CLIENT_SECRET
      ? `set (${process.env.NUXT_STRAVA_CLIENT_SECRET.length} chars)`
      : 'MISSING',
    NUXT_STRAVA_REFRESH_TOKEN: process.env.NUXT_STRAVA_REFRESH_TOKEN
      ? `set (${process.env.NUXT_STRAVA_REFRESH_TOKEN.length} chars, starts: ${process.env.NUXT_STRAVA_REFRESH_TOKEN.slice(0, 6)})`
      : 'MISSING',
    runtimeConfig: (() => {
      const c = useRuntimeConfig().strava
      return {
        clientId: c.clientId ? `set (${c.clientId.length} chars)` : 'MISSING',
        clientSecret: c.clientSecret ? `set (${c.clientSecret.length} chars)` : 'MISSING',
        refreshToken: c.refreshToken ? `set (${c.refreshToken.length} chars)` : 'MISSING'
      }
    })()
  }
})
