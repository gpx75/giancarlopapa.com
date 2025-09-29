// https://nuxt.com/docs/api/configuration/nuxt-config
const {
  CAL_API_KEY = '',
  CAL_USERNAME = '',
  CAL_BASE_URL = 'https://api.cal.com',
  SITE_URL = 'https://giancarlopapa.com',
  CONTACT_EMAIL = 'hello@giancarlopapa.com'
} = process.env;

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxthub/core',
    '@nuxt/ui',
    '@nuxt/content',
    '@nuxt/image',
    '@nuxt/test-utils'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    cal: {
      apiKey: CAL_API_KEY,
      username: CAL_USERNAME,
      baseUrl: CAL_BASE_URL
    },
    public: {
      siteUrl: SITE_URL,
      contactEmail: CONTACT_EMAIL
    }
  },

  routeRules: {},
  compatibilityDate: '2025-01-15',

  nitro: {
    preset: 'cloudflare_module'
  },

  hub: {
    kv: true,
    cache: true,
    database: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
});
