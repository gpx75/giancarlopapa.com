// https://nuxt.com/docs/api/configuration/nuxt-config
import { execSync } from 'node:child_process';

const commitSha =
  process.env.GITHUB_SHA ||
  (() => {
    try {
      return execSync('git rev-parse origin/main').toString().trim();
    } catch {
      return '';
    }
  })();

const commitDate = commitSha
  ? (() => {
      try {
        return execSync(`git log -1 --format=%as ${commitSha}`)
          .toString()
          .trim();
      } catch {
        return '';
      }
    })()
  : '';

const noIndexHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Robots-Tag': 'noindex, nofollow, noarchive'
};

export default defineNuxtConfig({
  modules: [
    'nuxt-auth-utils',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/content',
    '@nuxt/image',
    'nuxt-gtag',
    '@nuxtjs/mcp-toolkit',
    '@nuxtjs/supabase'
  ],

  devtools: {
    enabled: process.env.NODE_ENV !== 'production'
  },

  css: ['~/assets/css/main.css'],

  ui: {
    theme: {
      colors: [
        'primary',
        'secondary',
        'tertiary',
        'info',
        'success',
        'warning',
        'error'
      ]
    }
  },

  // All custom env vars follow the Nuxt NUXT_ prefix convention so they
  // auto-bind to this runtimeConfig tree. See
  // https://nuxt.com/docs/guide/going-further/runtime-config
  // Mapping (runtimeConfig key → env var):
  //   contactEmail         → NUXT_CONTACT_EMAIL
  //   cal.apiKey           → NUXT_CAL_API_KEY
  //   cal.username         → NUXT_CAL_USERNAME
  //   cal.baseUrl          → NUXT_CAL_BASE_URL
  //   resend.apiKey        → NUXT_RESEND_API_KEY
  //   resend.toEmail       → NUXT_RESEND_TO_EMAIL
  //   resendAudienceId     → NUXT_RESEND_AUDIENCE_ID
  //   strava.clientId      → NUXT_STRAVA_CLIENT_ID
  //   strava.clientSecret  → NUXT_STRAVA_CLIENT_SECRET
  //   strava.refreshToken  → NUXT_STRAVA_REFRESH_TOKEN
  //   gmail.user           → NUXT_GMAIL_USER
  //   gmail.appPassword    → NUXT_GMAIL_APP_PASSWORD
  //   anthropicApiKey      → NUXT_ANTHROPIC_API_KEY
  //   rapidApiKey          → NUXT_RAPID_API_KEY
  //   public.siteUrl       → NUXT_PUBLIC_SITE_URL
  runtimeConfig: {
    contactEmail: '',
    cal: {
      apiKey: '',
      username: '',
      baseUrl: 'https://api.cal.com'
    },
    resend: {
      apiKey: '',
      toEmail: ''
    },
    resendAudienceId: '',
    strava: {
      clientId: '',
      clientSecret: '',
      refreshToken: ''
    },
    gmail: {
      user: '',
      appPassword: ''
    },
    anthropicApiKey: '',
    rapidApiKey: '',
    public: {
      siteUrl: 'https://giancarlopapa.com',
      commitSha,
      commitDate
    }
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-DNS-Prefetch-Control': 'off',
        'X-Permitted-Cross-Domain-Policies': 'none',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Strict-Transport-Security':
          'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy':
          'camera=(), microphone=(), geolocation=(), browsing-topics=()',
        'Content-Security-Policy':
          "base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; upgrade-insecure-requests"
      }
    },
    '/api/**': { headers: noIndexHeaders },
    '/contact': { headers: noIndexHeaders },
    '/book': { headers: noIndexHeaders },
    '/resume': { headers: noIndexHeaders }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    preset: 'vercel'
  },

  // Pre-bundle @supabase/ssr and @supabase/supabase-js so Vite resolves
  // their `import { parse, serialize } from 'cookie'` inside the
  // optimizer. Otherwise Vite serves @supabase/ssr raw and the browser
  // loads cookie@1.1.1's CJS dist, which has no ESM named exports.
  vite: {
    optimizeDeps: {
      include: [
        'cookie',
        '@supabase/ssr',
        '@supabase/ssr > cookie',
        '@supabase/supabase-js'
      ]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  gtag: {
    initMode: 'auto',
    id: process.env.NUXT_PUBLIC_GTAG_ID || ''
  },

  image: {
    provider: process.env.VERCEL ? 'vercel' : 'ipx',
    screens: {
      avatar: 256,
      avatar2x: 320
    }
  },

  mcp: {
    name: 'giancarlopapa.com',
    route: '/mcp',
    dir: 'mcp'
  },

  // Supabase: Vercel's Supabase integration injects SUPABASE_URL,
  // SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. We map those explicitly
  // here so @nuxtjs/supabase can pick them up without renaming.
  // redirect:false disables the module's auth redirect middleware — we
  // use nuxt-auth-utils (OAuth) for auth; Supabase is server-only data.
  supabase: {
    redirect: false,
    useSsrCookies: false,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
});
