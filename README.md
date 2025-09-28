# Giancarlo Papa · Nuxt 4 CV

A personal CV site built with Nuxt 4 and Nuxt UI, designed to deploy on Cloudflare via NuxtHub. Profile data lives in the NuxtHub (Cloudflare D1) database, with NuxtHub KV providing a fast cache and static fallback data bundled at build time.

## Highlights

- ⚡️ Nuxt 4 + Nuxt UI for a fast, accessible CV experience
- ☁️ NuxtHub preset for Cloudflare Workers (module preset) deployment
- 🗃️ NuxtHub database (D1) with KV caching and local fallback data
- 🧱 Component-driven layout with reusable CV sections (experience, projects, writing, contact)

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to view the site.

## Environment

Create an `.env` file (or configure environment variables in your hosting provider):

```bash
SITE_URL=https://giancarlopapa.com
CONTACT_EMAIL=hello@giancarlopapa.com
CAL_API_KEY=your_cal_com_api_key
CAL_USERNAME=gpx-dev
# Optional: override for self-hosted Cal instance
# CAL_BASE_URL=https://api.cal.com
```

`SITE_URL` and `CONTACT_EMAIL` drive canonical URLs and the default contact link.
`CAL_API_KEY` and `CAL_USERNAME` enable the custom booking flow at `/book`.

## Data storage

NuxtHub keeps the canonical profile JSON in a `profiles` table. The endpoint caches the latest version in NuxtHub KV (and falls back to `app/data/profile.ts` while bootstrapping).

Example setup:

```bash
npx nuxthub database query "CREATE TABLE IF NOT EXISTS profiles (slug TEXT PRIMARY KEY, payload TEXT NOT NULL);"
npx nuxthub database query "INSERT OR REPLACE INTO profiles (slug, payload) VALUES ('giancarlo-papa', json(?));" '<your JSON payload here>'
```

Replace the placeholder JSON with your own data that matches the `CvProfile` shape from `app/data/profile.ts`.

## Deploying on Cloudflare with NuxtHub

1. Install the [NuxtHub CLI](https://hub.nuxt.com) and link your project.
2. Provision the resources you need (KV and Database):
   ```bash
   npx nuxthub init
   npx nuxthub storage create kv
   npx nuxthub database apply
   ```
3. Push your environment variables to NuxtHub / Cloudflare.
4. Deploy with:
   ```bash
   npx nuxthub deploy
   ```

NuxtHub automatically configures the correct Cloudflare Workers module preset defined in `nuxt.config.ts`.

## Project Structure

```
app/
  components/cv/   # Reusable CV presentation components
  composables/     # Data fetching and state logic
  data/            # Default profile content (fallback)
  pages/           # Nuxt pages (single-page CV)
server/api/        # NuxtHub database + KV backed API endpoint
```

## Useful Scripts

```bash
npm run dev      # Start local development
npm run build    # Production build
npm run preview  # Preview the production build locally
npm run lint     # ESLint checks
``` 

---

Questions or improvements? Open an issue or reach out at `hello@giancarlopapa.com`.
