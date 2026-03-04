/**
 * One-time Strava OAuth setup.
 * Generates a fresh NUXT_STRAVA_REFRESH_TOKEN for Vercel.
 *
 * Usage:
 *   STRAVA_CLIENT_ID=xxx STRAVA_CLIENT_SECRET=yyy node scripts/strava-auth.mjs
 *
 * Get CLIENT_ID and CLIENT_SECRET from:
 *   https://www.strava.com/settings/api
 *
 * Steps:
 *   1. Go to https://www.strava.com/settings/api
 *   2. Set "Authorization Callback Domain" to localhost
 *   3. Run this script with your Client ID and Secret
 *   4. Open the printed URL, authorize, tokens print here
 *   5. Update NUXT_STRAVA_REFRESH_TOKEN in Vercel:
 *      vercel env rm NUXT_STRAVA_REFRESH_TOKEN production
 *      vercel env add NUXT_STRAVA_REFRESH_TOKEN production
 *
 * Refresh tokens are long-lived but must be updated after each use.
 * Re-run this script if you ever get 401 errors on /runs.
 */

import { createServer } from 'node:http'

const CLIENT_ID = process.env.STRAVA_CLIENT_ID
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:3333/callback'
const SCOPE = 'activity:read_all'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET env vars.')
  console.error('Get them from: https://www.strava.com/settings/api')
  process.exit(1)
}

const authUrl = new URL('https://www.strava.com/oauth/authorize')
authUrl.searchParams.set('client_id', CLIENT_ID)
authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('approval_prompt', 'force')
authUrl.searchParams.set('scope', SCOPE)

console.log('\nOpen this URL in your browser:\n')
console.log(authUrl.toString())
console.log('\nWaiting for authorization...\n')

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3333')
  if (url.pathname !== '/callback') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const code = url.searchParams.get('code')
  const callbackError = url.searchParams.get('error')

  if (callbackError) {
    res.writeHead(400)
    res.end(`Strava error: ${callbackError}`)
    console.error('\nStrava returned an error:', callbackError)
    server.close()
    return
  }

  if (!code) {
    res.writeHead(400)
    res.end('No authorization code received.')
    console.error('\nNo code in callback URL.')
    server.close()
    return
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    })
  })

  const tokens = await tokenRes.json()

  if (tokens.errors || tokens.message === 'Bad Request') {
    res.writeHead(400)
    res.end(`Token error: ${JSON.stringify(tokens)}`)
    console.error('\nToken error:', tokens)
    server.close()
    return
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Authorized. Check your terminal.')

  console.log('─────────────────────────────────────────────────')
  console.log('Update this in Vercel:\n')
  console.log(`NUXT_STRAVA_REFRESH_TOKEN  ${tokens.refresh_token}`)
  console.log('─────────────────────────────────────────────────')
  console.log('\nThen run:')
  console.log('  vercel env rm NUXT_STRAVA_REFRESH_TOKEN production')
  console.log('  vercel env add NUXT_STRAVA_REFRESH_TOKEN production')
  console.log('\nNo redeploy needed — Vercel picks up the new value immediately.\n')

  server.close()
})

server.listen(3333, () => {
  console.log('Listening on http://localhost:3333/callback ...')
})
