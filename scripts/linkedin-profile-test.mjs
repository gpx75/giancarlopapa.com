/**
 * Tests whether the current LinkedIn access token has Profile Edit API access.
 *
 * Checks:
 *   1. Token validity + current scopes (GET /v2/me)
 *   2. Read existing positions (GET /v2/people/id={urn}/positions)
 *   3. Read existing educations (GET /v2/people/id={urn}/educations)
 *
 * Required env vars:
 *   LINKEDIN_ACCESS_TOKEN  — OAuth access token
 *   LINKEDIN_PERSON_URN    — e.g. urn:li:person:XXXXXXXX
 *
 * Run:
 *   LINKEDIN_ACCESS_TOKEN=xxx LINKEDIN_PERSON_URN=urn:li:person:xxx node scripts/linkedin-profile-test.mjs
 */

const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN
const PERSON_URN = process.env.LINKEDIN_PERSON_URN

if (!ACCESS_TOKEN || !PERSON_URN) {
  console.error('Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN')
  process.exit(1)
}

// Extract the person ID from the URN (urn:li:person:XXXXX → XXXXX)
const personId = PERSON_URN.split(':').pop()

const headers = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'X-Restli-Protocol-Version': '2.0.0'
}

function label(text) {
  console.log(`\n── ${text}`)
}

function ok(msg) { console.log(`   ✓ ${msg}`) }
function fail(msg) { console.log(`   ✗ ${msg}`) }
function info(msg) { console.log(`   · ${msg}`) }

async function check(name, url) {
  label(name)
  const res = await fetch(url, { headers })
  const body = await res.text()
  let parsed
  try { parsed = JSON.parse(body) } catch { parsed = null }

  info(`${res.status} ${res.statusText}`)

  if (res.ok) {
    ok('Access granted')
    if (parsed?.elements?.length) {
      info(`${parsed.elements.length} element(s) returned`)
    } else if (parsed) {
      info(JSON.stringify(parsed).slice(0, 200))
    }
    return true
  }

  if (res.status === 401) {
    fail('Token expired or invalid — run `node scripts/linkedin-auth.mjs` to refresh')
  } else if (res.status === 403) {
    fail('Access denied — this scope is not available to your app')
    if (parsed?.message) info(`LinkedIn says: ${parsed.message}`)
  } else if (res.status === 404) {
    fail('Endpoint not found or person URN incorrect')
  } else {
    fail(`Unexpected error: ${body.slice(0, 300)}`)
  }
  return false
}

async function main() {
  console.log('LinkedIn Profile Edit API — Access Test')
  console.log('━'.repeat(45))
  info(`Person URN: ${PERSON_URN}`)
  info(`Person ID:  ${personId}`)

  // 1. Basic token check (OpenID Connect — works with 'openid profile' scope)
  label('Token validity (GET /v2/userinfo)')
  const meRes = await fetch('https://api.linkedin.com/v2/userinfo', { headers })
  const meBody = await meRes.text()
  let me
  try { me = JSON.parse(meBody) } catch { me = null }

  if (!meRes.ok) {
    fail(`Token check failed (${meRes.status}) — cannot proceed`)
    if (me?.message) info(`LinkedIn says: ${me.message}`)
    process.exit(1)
  }
  ok(`Token valid — ${me?.name ?? me?.given_name ?? ''}`.trim())

  // 2. Introspect token scopes
  label('Token introspection (GET /v2/introspectToken)')
  const introspectRes = await fetch('https://api.linkedin.com/v2/introspectToken', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `token=${encodeURIComponent(ACCESS_TOKEN)}`
  })
  const introspectBody = await introspectRes.text()
  let introspect
  try { introspect = JSON.parse(introspectBody) } catch { introspect = null }

  if (introspectRes.ok && introspect?.scope) {
    ok('Scopes: ' + introspect.scope)
    const expiresAt = introspect.expires_at ? new Date(introspect.expires_at * 1000).toLocaleDateString() : 'unknown'
    info(`Expires: ${expiresAt}`)
  } else {
    info('Could not read scopes (requires client credentials — skipping)')
  }

  // 3. Read positions
  await check(
    'Read positions (GET /v2/people/id={id}/positions)',
    `https://api.linkedin.com/v2/people/id=${personId}/positions`
  )

  // 4. Read education
  await check(
    'Read educations (GET /v2/people/id={id}/educations)',
    `https://api.linkedin.com/v2/people/id=${personId}/educations`
  )

  // 5. Read skills
  await check(
    'Read skills (GET /v2/people/id={id}/skills)',
    `https://api.linkedin.com/v2/people/id=${personId}/skills`
  )

  // 6. Read profile summary/headline
  await check(
    'Read full profile (GET /v2/people/id={id})',
    `https://api.linkedin.com/v2/people/id=${personId}`
  )

  console.log('\n' + '━'.repeat(45))
  console.log('Done. Review results above to determine what is accessible.')
  console.log('If all show ✗ 403, your app needs elevated LinkedIn Partner API access.')
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
