// https://nuxt.com/docs/api/configuration/nuxt-config
import { execSync } from 'node:child_process';

const {
  CAL_API_KEY = '',
  CAL_USERNAME = '',
  CAL_BASE_URL = 'https://api.cal.com',
  SITE_URL = 'https://giancarlopapa.com',
  CONTACT_EMAIL = 'hello@giancarlopapa.com',
  RESEND_API_KEY = '',
  RESEND_TO_EMAIL = 'giancarlo.papa@gmail.com',
  NUXT_STRAVA_CLIENT_ID: STRAVA_CLIENT_ID = '',
  NUXT_STRAVA_CLIENT_SECRET: STRAVA_CLIENT_SECRET = '',
  NUXT_STRAVA_REFRESH_TOKEN: STRAVA_REFRESH_TOKEN = '',
  GITHUB_SHA = ''
} = process.env;

const commitSha =
  GITHUB_SHA ||
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

export default defineNuxtConfig({
  modules: [
    'nuxt-auth-utils',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/content',
    '@nuxt/image',
    'nuxt-gtag'
  ],

  devtools: {
    enabled: process.env.NODE_ENV !== 'production'
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    contactEmail: CONTACT_EMAIL,
    cal: {
      apiKey: CAL_API_KEY,
      username: CAL_USERNAME,
      baseUrl: CAL_BASE_URL
    },
    resend: {
      apiKey: RESEND_API_KEY,
      toEmail: RESEND_TO_EMAIL
    },
    strava: {
      clientId: STRAVA_CLIENT_ID,
      clientSecret: STRAVA_CLIENT_SECRET,
      refreshToken: STRAVA_REFRESH_TOKEN
    },
    public: {
      siteUrl: SITE_URL,
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
    '/api/**': {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        Pragma: 'no-cache',
        'X-Robots-Tag': 'noindex, nofollow, noarchive'
      }
    },
    '/contact': {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        Pragma: 'no-cache',
        'X-Robots-Tag': 'noindex, nofollow, noarchive'
      }
    },
    '/book': {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        Pragma: 'no-cache',
        'X-Robots-Tag': 'noindex, nofollow, noarchive'
      }
    },
    '/resume': {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        Pragma: 'no-cache',
        'X-Robots-Tag': 'noindex, nofollow, noarchive'
      }
    }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    preset: 'vercel',
    vercel: {
      functions: {
        '/api/resume/pdf': {
          maxDuration: 60
        }
      }
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
    screens: {
      avatar: 256,
      avatar2x: 320
    }
  },
});
