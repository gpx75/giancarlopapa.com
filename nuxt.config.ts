// https://nuxt.com/docs/api/configuration/nuxt-config
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
      apiKey: process.env.CAL_API_KEY || '',
      username: process.env.CAL_USERNAME || '',
      baseUrl: process.env.CAL_BASE_URL || 'https://api.cal.com'
    },
    public: {
      siteUrl: process.env.SITE_URL || 'https://giancarlopapa.com',
      contactEmail: process.env.CONTACT_EMAIL || 'hello@giancarlopapa.com'
    }
  },

  routeRules: {},
  compatibilityDate: '2025-01-15',

  nitro: {
    preset: 'cloudflare_module'
  },

  hub: {
    kv: true,
    storage: true,
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
})
