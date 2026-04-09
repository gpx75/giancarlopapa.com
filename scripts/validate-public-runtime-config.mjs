import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const filePath = resolve(process.cwd(), 'nuxt.config.ts')
const source = await readFile(filePath, 'utf8')

function extractObjectBlock(code, marker) {
  const markerIndex = code.indexOf(marker)
  if (markerIndex === -1) {
    throw new Error(`Marker not found: ${marker}`)
  }

  const openBraceIndex = code.indexOf('{', markerIndex)
  if (openBraceIndex === -1) {
    throw new Error(`Opening brace not found after marker: ${marker}`)
  }

  let depth = 0
  for (let i = openBraceIndex; i < code.length; i++) {
    const char = code[i]
    if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) {
        return code.slice(openBraceIndex + 1, i)
      }
    }
  }

  throw new Error(`Unclosed object block for marker: ${marker}`)
}

const runtimeConfigBody = extractObjectBlock(source, 'runtimeConfig:')
const publicBody = extractObjectBlock(runtimeConfigBody, 'public:')

const keyRegex = /^\s*([A-Za-z_$][\w$]*)\s*:/gm
const publicKeys = new Set()
for (const match of publicBody.matchAll(keyRegex)) {
  publicKeys.add(match[1])
}

const allowedPublicKeys = new Set([
  'siteUrl',
  'commitSha',
  'commitDate'
])

const unexpected = [...publicKeys].filter(key => !allowedPublicKeys.has(key))

if (unexpected.length > 0) {
  console.error('\n❌ Security check failed: unexpected keys in runtimeConfig.public')
  console.error(`Found: ${unexpected.join(', ')}`)
  console.error(`Allowed: ${[...allowedPublicKeys].join(', ')}`)
  console.error('Move sensitive values to private runtimeConfig and keep only safe public keys.\n')
  process.exit(1)
}

console.log('✅ runtimeConfig.public security check passed')
