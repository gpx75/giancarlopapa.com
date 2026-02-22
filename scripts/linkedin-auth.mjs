/**
 * One-time LinkedIn OAuth setup.
 * Generates LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN for GitHub secrets.
 *
 * Usage:
 *   LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=yyy node scripts/linkedin-auth.mjs
 *
 * Get CLIENT_ID and CLIENT_SECRET from:
 *   https://www.linkedin.com/developers/apps → your app → Auth tab
 *
 * Steps:
 *   1. Create a LinkedIn Developer App (if you don't have one)
 *   2. Add "Share on LinkedIn" product (self-serve, instant approval)
 *   3. Set redirect URI to: http://localhost:3333/callback
 *   4. Run this script with your Client ID and Secret
 *   5. Open the printed URL, authorize, tokens print here
 *   6. Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN to GitHub secrets
 *
 * Token expires in 60 days — re-run this script to refresh.
 */

import { createServer } from 'node:http'

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:3333/callback'
const SCOPE = 'openid profile w_member_social'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET env vars.')
  console.error('Get them from: https://www.linkedin.com/developers/apps → Auth tab')
  process.exit(1)
}

const state = Math.random().toString(36).slice(2)
const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('client_id', CLIENT_ID)
authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
authUrl.searchParams.set('state', state)
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
  const returnedState = url.searchParams.get('state')
  const callbackError = url.searchParams.get('error')

  console.log('\nCallback received:')
  console.log('  code:        ', code ?? '(none)')
  console.log('  state match: ', returnedState === state)
  console.log('  error:       ', callbackError ?? '(none)')
  console.log('  full URL:    ', req.url)

  if (callbackError) {
    const desc = url.searchParams.get('error_description') ?? callbackError
    res.writeHead(400)
    res.end(`LinkedIn error: ${desc}`)
    console.error('\nLinkedIn returned an error:', callbackError, desc)
    server.close()
    return
  }

  if (returnedState !== state) {
    res.writeHead(400)
    res.end('State mismatch. Try again.')
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
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }).toString()
  })

  const tokens = await tokenRes.json()

  if (tokens.error) {
    res.writeHead(400)
    res.end(`Error: ${tokens.error_description}`)
    console.error('\nToken error:', tokens)
    server.close()
    return
  }

  // Fetch person URN
  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  })
  const profile = await profileRes.json()
  const personUrn = `urn:li:person:${profile.sub}`

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Authorized. Check your terminal.')

  const expiryDays = Math.floor(tokens.expires_in / 86400)
  console.log('─────────────────────────────────────────────────')
  console.log('Add these to GitHub → Settings → Secrets:\n')
  console.log(`LINKEDIN_ACCESS_TOKEN  ${tokens.access_token}`)
  console.log(`LINKEDIN_PERSON_URN    ${personUrn}`)
  console.log('─────────────────────────────────────────────────')
  console.log(`\nToken expires in ${expiryDays} days.`)
  console.log('Re-run this script before it expires to refresh.\n')

  server.close()
})

server.listen(3333, () => {
  console.log('Listening on http://localhost:3333/callback ...')
})
