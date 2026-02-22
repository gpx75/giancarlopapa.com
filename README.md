# giancarlopapa.com

Personal portfolio site for Giancarlo Papa — Senior Full Stack Engineer.

**Stack:** Nuxt 4 · Nuxt UI v4 · Nuxt Content v3 · Cal.com · Resend · Vercel

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage — hero, about, services |
| `/resume` | Full CV rendered from JSON Resume |
| `/blog` | Blog listing (Markdown via @nuxt/content) |
| `/blog/[slug]` | Individual post with prose styling |
| `/book` | Cal.com booking flow |
| `/contact` | Contact form (Resend) |
| `/skillmatrix` | Tech skills with proficiency levels |
| `/colophon` | About this site |

## Development

```bash
npm install
npm run dev
```

## Environment variables

Create a `.env` file in the project root:

```env
# Cal.com booking integration
CAL_API_KEY=cal_live_...
CAL_USERNAME=your-cal-username
CAL_BASE_URL=https://api.cal.com

# Site
SITE_URL=https://giancarlopapa.com
CONTACT_EMAIL=hello@giancarlopapa.com

# Contact form (resend.com)
RESEND_API_KEY=re_...
RESEND_TO_EMAIL=giancarlo.papa@gmail.com
```

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build locally
npm run typecheck  # TypeScript check
npm run lint       # ESLint
npm run deploy     # Deploy to Vercel (prod)
```

## Content

Blog posts live in `content/blog/*.md` with this frontmatter:

```yaml
---
title: "Post title"
description: "Short description"
date: "2026-02-22"
tags: ["tag1", "tag2"]
draft: false
---
```

The resume is `content/giancarlo_papa_resume.json` (JSON Resume format).

## Contact form

Sends email via [Resend](https://resend.com) — `server/api/contact.post.ts`.

The `from` address is `noreply@giancarlopapa.com`. Verify the domain at resend.com/domains before going to production. For local testing use `onboarding@resend.dev`.

## Booking

Cal.com integration in `server/utils/cal.ts` and `server/api/cal/`:

- Event types: `GET /v1/event-types`
- Available slots: `GET /v2/slots` (cal-api-version: 2024-09-04)
- Create booking: `POST /v2/bookings` (cal-api-version: 2024-08-13)

## Deployment

Hosted on [Vercel](https://vercel.com). Nitro preset: `vercel`.

```bash
npm run deploy   # builds and deploys to production
```

Set all env vars above in **Vercel → Settings → Environment Variables** before deploying.

## Project structure

```
app/
  pages/           # index.vue, resume.vue, book.vue, contact.vue, blog/, ...
  components/cv/   # CV section components
  composables/     # useCalBooking.ts, useProfileData.ts, useResumeContent.ts
  data/            # Static profile data
  types/           # TypeScript types (cal.ts, resume.ts)
  assets/css/      # Tailwind theme, Snazzy colours, typography
server/
  api/             # contact.post.ts, profile.get.ts, cal/
  utils/cal.ts     # Cal.com API client
content/
  blog/            # Markdown blog posts
  giancarlo_papa_resume.json
content.config.ts  # @nuxt/content collection schema
```
