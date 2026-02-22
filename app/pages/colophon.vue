<script setup lang="ts">
useSeoMeta({
  title: 'Colophon — Giancarlo Papa',
  description: 'How this site is built.'
})

const stack = [
  {
    label: 'Framework',
    name: 'Nuxt 4',
    description: 'Vue-based full-stack framework with file-based routing and server API routes.',
    url: 'https://nuxt.com'
  },
  {
    label: 'UI',
    name: 'Nuxt UI v4',
    description: 'Component library built on top of Tailwind CSS v4 and Radix Vue.',
    url: 'https://ui.nuxt.com'
  },
  {
    label: 'Styling',
    name: 'Tailwind CSS v4',
    description: 'Utility-first CSS framework.',
    url: 'https://tailwindcss.com'
  },
  {
    label: 'Type — headings',
    name: 'Space Grotesk',
    description: 'Geometric sans-serif by Florian Karsten. Via Google Fonts.',
    url: 'https://fonts.google.com/specimen/Space+Grotesk'
  },
  {
    label: 'Type — body',
    name: 'JetBrains Mono',
    description: 'Monospace font by JetBrains. Via Google Fonts.',
    url: 'https://fonts.google.com/specimen/JetBrains+Mono'
  },
  {
    label: 'Colour palette',
    name: 'Snazzy',
    description: 'Terminal colour scheme by Sindre Sorhus. Magenta #ff6ac1 as primary, green #5af78e as accent.',
    url: 'https://github.com/sindresorhus/hyper-snazzy'
  },
  {
    label: 'Email',
    name: 'Resend',
    description: 'Email API for the contact form.',
    url: 'https://resend.com'
  },
  {
    label: 'Deployment',
    name: 'Vercel',
    description: 'Serverless deployment platform.',
    url: 'https://vercel.com'
  },
  {
    label: 'Icons',
    name: 'Lucide + Simple Icons',
    description: 'Via Iconify and @nuxt/icon.',
    url: 'https://lucide.dev'
  }
]
</script>

<template>
  <UContainer class="space-y-12 py-16">
    <div class="space-y-4">
      <UBadge color="neutral" variant="soft" class="tracking-wider text-xs">
        <span><span class="text-terminal-400/60">~/</span>colophon</span>
      </UBadge>
      <h1>Colophon</h1>
      <p class="text-muted/80 max-w-2xl">
        This site is a personal portfolio built in the open. Here's what it's made of.
      </p>
    </div>

    <div class="space-y-3">
      <UCard
        v-for="item in stack"
        :key="item.label"
        class="grid grid-cols-[160px,1fr] items-start gap-6"
      >
        <p class="text-xs uppercase tracking-widest text-muted/50 pt-1">
          {{ item.label }}
        </p>
        <div class="space-y-1">
          <a
            :href="item.url"
            target="_blank"
            rel="noopener"
            class="text-sm font-semibold hover:text-primary transition"
          >
            {{ item.name }} <UIcon name="i-lucide-arrow-up-right" class="size-3 inline opacity-50" />
          </a>
          <p class="text-sm text-muted/60">{{ item.description }}</p>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
