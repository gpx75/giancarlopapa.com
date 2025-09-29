import type { Storage } from 'unstorage'
import { defaultProfile, type CvProfile } from '~/data/profile'

type ProfileSource = 'hub-database' | 'hub-kv' | 'static'

type HubStorage = Storage | null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HubDatabase = any

let hasEnsuredProfilesTable = false

async function ensureProfilesTable(db: HubDatabase) {
  if (hasEnsuredProfilesTable) {
    return
  }

  try {
    await db
      .prepare('CREATE TABLE IF NOT EXISTS profiles (slug TEXT PRIMARY KEY, payload TEXT NOT NULL)')
      .run()

    hasEnsuredProfilesTable = true
  } catch (error) {
    console.error('[profile.get] Failed to ensure profiles table', error)
  }
}

async function readFromHub(): Promise<CvProfile | null> {
  let storage: HubStorage = null

  try {
    storage = useStorage('hubKV')
  } catch (error) {
    console.warn('[profile.get] Hub KV unavailable', error)
    return null
  }

  if (!storage) {
    return null
  }

  const cached = await storage.getItem<CvProfile>('profile:latest')
  return cached ?? null
}

async function writeToHub(profile: CvProfile) {
  let storage: HubStorage = null

  try {
    storage = useStorage('hubKV')
  } catch (error) {
    console.warn('[profile.get] Hub KV unavailable', error)
    return
  }

  if (!storage) {
    return
  }

  await storage.setItem('profile:latest', profile)
}

async function readFromDatabase(): Promise<CvProfile | null> {
  try {
    const db = hubDatabase()

    await ensureProfilesTable(db)

    const statement = db
      .prepare('SELECT payload FROM profiles WHERE slug = ? LIMIT 1')
      .bind('giancarlo-papa')

    const rawPayload = await statement.first('payload')
    if (!rawPayload) {
      try {
        await db
          .prepare('INSERT OR REPLACE INTO profiles (slug, payload) VALUES (?, ?)')
          .bind('giancarlo-papa', JSON.stringify(defaultProfile))
          .run()
        return defaultProfile
      } catch (seedError) {
        console.error('[profile.get] Failed to seed default profile', seedError)
        return null
      }
    }

    if (typeof rawPayload === 'string') {
      try {
        return JSON.parse(rawPayload) as CvProfile
      } catch (error) {
        console.error('[profile.get] Failed to parse JSON payload from database', error)
        return null
      }
    }

    if (typeof rawPayload === 'object' && rawPayload !== null) {
      return rawPayload as CvProfile
    }

    console.warn('[profile.get] Unexpected payload shape from database', rawPayload)
  } catch (error) {
    console.error('[profile.get] Hub database fetch failed', error)
  }

  return null
}

export default defineEventHandler(async () => {
  const cachedProfile = await readFromHub()
  if (cachedProfile) {
    return { profile: cachedProfile, source: 'hub-kv' as ProfileSource }
  }

  const databaseProfile = await readFromDatabase()
  if (databaseProfile) {
    await writeToHub(databaseProfile)
    return { profile: databaseProfile, source: 'hub-database' as ProfileSource }
  }

  await writeToHub(defaultProfile)
  return { profile: defaultProfile, source: 'static' as ProfileSource }
})
