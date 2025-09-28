export interface CvActionLink {
  label: string;
  to: string;
  icon?: string;
  external?: boolean;
}

export interface CvContactLink {
  label: string;
  to: string;
  icon: string;
}

export interface CvStat {
  label: string;
  value: string;
}

export interface CvCallToAction {
  label: string;
  to: string;
}

export interface CvHero {
  name: string;
  role: string;
  location: string;
  availability: string;
  summary: string;
  actions: CvActionLink[];
  contactLinks: CvContactLink[];
}

export interface CvExperienceItem {
  company: string;
  role: string;
  period: string;
  location: string;
  summary: string;
  achievements: string[];
  stack: string[];
}

export interface CvProjectItem {
  name: string;
  summary: string;
  links: CvActionLink[];
  stack: string[];
}

export interface CvWritingItem {
  title: string;
  description: string;
  platform: string;
  to: string;
  publishedAt: string;
}

export interface CvSkillGroup {
  label: string;
  items: string[];
}

export interface CvProfile {
  hero: CvHero;
  about: string[];
  stats: CvStat[];
  experience: CvExperienceItem[];
  projects: CvProjectItem[];
  skills: CvSkillGroup[];
  writing: CvWritingItem[];
  contact: {
    headline: string;
    subline: string;
    cta: CvCallToAction;
  };
}

export const defaultProfile: CvProfile = {
  hero: {
    name: "Giancarlo Papa",
    role: "Full-stack Web Developer",
    location: "Zürich, Switzerland",
    availability: "Open to remote-first roles and high-impact engagements",
    summary:
      "I craft resilient web platforms that blend crafted UX with measurable business outcomes. From prototypes to hyperscale traffic, I help teams deliver thoughtfully shipped product increments.",
    actions: [
      { label: "View resume", to: "/resume", icon: "i-lucide-file-text" },
      {
        label: "Book a call",
        to: "/book",
        icon: "i-lucide-calendar",
        external: true,
      },
    ],
    contactLinks: [
      {
        label: "Email",
        to: "mailto:hello@giancarlopapa.com",
        icon: "i-lucide-mail",
      },
      {
        label: "GitHub",
        to: "https://github.com/giancarlopapa",
        icon: "i-simple-icons-github",
      },
      {
        label: "LinkedIn",
        to: "https://www.linkedin.com/in/giancarlopapa",
        icon: "i-simple-icons-linkedin",
      },
    ],
  },
  about: [
    "I am a product-minded engineer blending design sensibilities with platform architecture expertise. I partner with founders and product teams to launch resilient experiences that evolve quickly without sacrificing reliability.",
    "In the last five years I have focused on Nuxt, Cloudflare Workers, and the modern edge. I founded internal design systems, shaped DX tooling, and direct cross-functional initiatives from discovery to delivery.",
  ],
  stats: [
    { label: "Years shipping products", value: "10+" },
    { label: "Startups supported", value: "25" },
    { label: "Ship cadence", value: "Every 2 weeks" },
  ],
  experience: [
    {
      company: "Compass Labs",
      role: "Principal Frontend Engineer",
      period: "2022 — Present",
      location: "Remote",
      summary:
        "Own the end-to-end experience layer for a developer analytics platform connecting Nuxt 4, NuxtHub, and Supabase services across the edge.",
      achievements: [
        "Led migration to NuxtHub on Cloudflare Pages, lowering cold start latency by 42% and unlocking data residency compliance.",
        "Bootstrapped a component system with Nuxt UI Pro, equipping designers with a live playground and Storybook parity.",
        "Designed a Supabase powered activity pipeline that streams 500k+ events per day with real-time moderation controls.",
      ],
      stack: [
        "Nuxt 4",
        "NuxtHub",
        "Supabase",
        "Cloudflare Workers",
        "Typescript",
        "TailwindCSS",
      ],
    },
    {
      company: "Northbridge Studio",
      role: "Lead Product Engineer",
      period: "2019 — 2022",
      location: "Hybrid · Zürich",
      summary:
        "Partnered with clients to design, ship, and scale revenue-critical web products with tight iteration loops.",
      achievements: [
        "Delivered a fintech onboarding platform handling 60k sign-ups per month with automated compliance workflows.",
        "Introduced performance budgets and observability guardrails, reducing Largest Contentful Paint to under 1.4s.",
        "Mentored a multidisciplinary team of 6 engineers and designers, raising deployment cadence from monthly to weekly.",
      ],
      stack: ["Nuxt 3", "Vercel", "PostgreSQL", "Prisma", "Figma"],
    },
    {
      company: "Freelance",
      role: "Product Designer & Engineer",
      period: "2015 — 2019",
      location: "Remote",
      summary:
        "Consulted with founders to turn research into working products with maintainable foundations.",
      achievements: [
        "Shipped MVPs for eight venture-backed startups with an average hand-off time of 6 weeks.",
        "Established reusable interface kits that reduced engineering handover defects by 35%.",
        "Facilitated discovery workshops and usability testing across North America and Europe.",
      ],
      stack: ["Vue", "Laravel", "AWS", "Storybook"],
    },
  ],
  projects: [
    {
      name: "EdgeForms",
      summary:
        "A NuxtHub-powered form automation toolkit deploying instantly to Cloudflare Workers with Supabase persistence.",
      links: [
        {
          label: "Visit project",
          to: "https://edgeforms.dev",
          icon: "i-lucide-external-link",
        },
        {
          label: "Case study",
          to: "https://giancarlopapa.com/writing/edgeforms-case-study",
        },
      ],
      stack: ["Nuxt 4", "NuxtHub", "Supabase", "Cloudflare D1"],
    },
    {
      name: "Pulse Atlas",
      summary:
        "Operational analytics dashboards shipped for health tech teams with role-based access and HIPAA controls.",
      links: [
        {
          label: "Prototype",
          to: "https://pulse-atlas.app",
          icon: "i-lucide-beaker",
        },
      ],
      stack: ["Nuxt UI", "tRPC", "PostgreSQL", "TailwindCSS"],
    },
    {
      name: "Studio Kit",
      summary:
        "A design-to-code bridge that syncs Figma tokens to Nuxt UI themes with live preview environments.",
      links: [
        {
          label: "Docs",
          to: "https://studiokit.dev/docs",
          icon: "i-lucide-book-open",
        },
      ],
      stack: ["Nuxt", "Figma Tokens", "Cloudflare Pages"],
    },
  ],
  skills: [
    {
      label: "Frontend",
      items: ["Nuxt 4", "Vue 3", "TypeScript", "Nuxt UI", "TailwindCSS"],
    },
    {
      label: "Platform",
      items: [
        "Cloudflare Workers",
        "NuxtHub",
        "Supabase",
        "Vercel",
        "Edge compute",
      ],
    },
    {
      label: "Practices",
      items: [
        "Design systems",
        "DX tooling",
        "A/B experimentation",
        "Accessibility-first",
      ],
    },
  ],
  writing: [
    {
      title: "Architecting resilient NuxtHub applications on Cloudflare",
      description:
        "An opinionated approach to structuring NuxtHub projects for globally distributed teams.",
      platform: "NuxtHub Blog",
      to: "https://giancarlopapa.com/writing/nuxt-hub-architecture",
      publishedAt: "Oct 2024",
    },
    {
      title: "Supabase as the heartbeat for event-driven Nuxt apps",
      description:
        "Patterns for streaming analytics pipelines without blocking the UX layer.",
      platform: "Dev.to",
      to: "https://dev.to/giancarlopapa/supabase-event-driven-nuxt",
      publishedAt: "Jun 2024",
    },
  ],
  contact: {
    headline: "Let's shape your next release",
    subline:
      "Available for fractional leadership engagements, audits, and hands-on product engineering.",
    cta: { label: "Schedule time", to: "https://cal.com/giancarlopapa/intro" },
  },
};
