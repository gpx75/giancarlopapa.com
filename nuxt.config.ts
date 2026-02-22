// https://nuxt.com/docs/api/configuration/nuxt-config
const {
  CAL_API_KEY = '',
  CAL_USERNAME = '',
  CAL_BASE_URL = 'https://api.cal.com',
  SITE_URL = 'https://giancarlopapa.com',
  CONTACT_EMAIL = 'hello@giancarlopapa.com',
  RESEND_API_KEY = '',
  RESEND_TO_EMAIL = 'giancarlo.papa@gmail.com'
} = process.env;

export default defineNuxtConfig({
  modules: [
    'nuxt-auth-utils',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/content',
    '@nuxt/image'
  ],

  devtools: {
    enabled: process.env.NODE_ENV !== 'production'
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    cal: {
      apiKey: CAL_API_KEY,
      username: CAL_USERNAME,
      baseUrl: CAL_BASE_URL
    },
    resend: {
      apiKey: RESEND_API_KEY,
      toEmail: RESEND_TO_EMAIL
    },
    public: {
      siteUrl: SITE_URL,
      contactEmail: CONTACT_EMAIL
    }
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
      }
    }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    preset: 'vercel'
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  image: {
    screens: {
      avatar: 256,
      avatar2x: 320
    }
  },
});
