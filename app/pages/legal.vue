<script setup lang="ts">
const {
  public: { siteUrl }
} = useRuntimeConfig();
const canonicalUrl = `${siteUrl}/legal`;

useSeoMeta({
  title: 'Legal — Giancarlo Papa',
  description:
    'Privacy policy, legal notice, and disclaimer for giancarlopapa.com.',
  ogTitle: 'Legal — Giancarlo Papa',
  ogDescription:
    'Privacy policy, legal notice, and disclaimer for giancarlopapa.com.',
  ogUrl: canonicalUrl,
  robots: 'noindex, follow',
  twitterCard: 'summary',
  twitterTitle: 'Legal — Giancarlo Papa',
  twitterDescription:
    'Privacy policy, legal notice, and disclaimer for giancarlopapa.com.'
});

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }]
});

const { data: legal } = await useAsyncData('legal', () =>
  queryCollection('legal').first()
);

const currentYear = new Date().getFullYear();

function withYear(text: string) {
  return text.replace('{year}', String(currentYear));
}
</script>

<template>
  <UContainer v-if="legal" class="max-w-3xl space-y-16 py-16">
    <div class="space-y-3">
      <UBadge color="neutral" variant="soft" class="tracking-wider text-xs">
        <span class="text-terminal-400/60">~/</span>legal
      </UBadge>
      <h1>Legal</h1>
      <p class="text-muted/80">
        Privacy policy, legal notice, and disclaimer for giancarlopapa.com.<br />
        <span class="text-xs text-muted/50"
          >Last updated: {{ legal.meta.lastUpdated }} · Governed by {{ legal.meta.governed }}</span
        >
      </p>
    </div>

    <!-- Legal Notice -->
    <section id="legal-notice" class="space-y-6">
      <div class="space-y-1">
        <h2>Legal Notice</h2>
        <p class="text-sm text-muted/60">
          Impressum — required under Swiss and EU law
        </p>
      </div>
      <UCard class="prose dark:prose-invert max-w-none">
        <p>This website is operated by a private individual:</p>
        <table>
          <tbody>
            <tr>
              <td class="font-medium">Name</td>
              <td>{{ legal.legalNotice.name }}</td>
            </tr>
            <tr>
              <td class="font-medium">Location</td>
              <td>{{ legal.legalNotice.location }}</td>
            </tr>
            <tr>
              <td class="font-medium">Email</td>
              <td>
                <NuxtLink
                  to="/contact"
                  class="underline hover:text-foreground transition"
                  >Use contact form</NuxtLink
                >
              </td>
            </tr>
            <tr>
              <td class="font-medium">Website</td>
              <td>
                <a :href="legal.legalNotice.websiteUrl">{{
                  legal.legalNotice.websiteUrl.replace('https://', '')
                }}</a>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="text-sm text-muted/70">{{ legal.legalNotice.note }}</p>
      </UCard>
    </section>

    <!-- Privacy Policy -->
    <section id="privacy" class="space-y-6">
      <div class="space-y-1">
        <h2>Privacy Policy</h2>
        <p class="text-sm text-muted/60">
          Compliant with Swiss nDSG and EU GDPR
        </p>
      </div>
      <div class="prose dark:prose-invert max-w-none space-y-6">
        <UCard>
          <h3>1. Controller</h3>
          <p>
            {{ legal.privacy.controller }} (<em>«I»</em>, <em>«me»</em>) is the
            data controller for all personal data processed through this website.
          </p>
        </UCard>

        <UCard>
          <h3>2. Data I collect and why</h3>
          <p v-for="item in legal.privacy.dataCollection" :key="item.label">
            <strong>{{ item.label }}</strong> — {{ item.description }}
          </p>
        </UCard>

        <UCard>
          <h3>3. Cookies</h3>
          <p>This site uses the following cookies:</p>
          <ul>
            <li v-for="cookie in legal.privacy.cookies" :key="cookie.name">
              <strong>{{ cookie.name }}</strong> — {{ cookie.description }}
              <template v-if="cookie.optOut">
                You can opt out at any time via the
                <a
                  :href="cookie.optOut.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ cookie.optOut.label }}</a
                >.
              </template>
            </li>
          </ul>
        </UCard>

        <UCard>
          <h3>4. Third-party processors</h3>
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Purpose</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="processor in legal.privacy.processors"
                  :key="processor.service"
                >
                  <td>{{ processor.service }}</td>
                  <td>{{ processor.purpose }}</td>
                  <td>{{ processor.country }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-sm text-muted/70">{{ legal.privacy.processorNote }}</p>
        </UCard>

        <UCard>
          <h3>5. Retention</h3>
          <p>{{ legal.privacy.retention }}</p>
        </UCard>

        <UCard>
          <h3>6. Your rights</h3>
          <p>Under the Swiss nDSG and EU GDPR you have the right to:</p>
          <ul>
            <li v-for="right in legal.privacy.rights" :key="right">
              {{ right }}
            </li>
          </ul>
          <p>
            To exercise any of these rights, please use the
            <NuxtLink
              to="/contact"
              class="underline hover:text-foreground transition"
              >contact form</NuxtLink
            >.
          </p>
        </UCard>
      </div>
    </section>

    <!-- Disclaimer -->
    <section id="disclaimer" class="space-y-6">
      <div class="space-y-1">
        <h2>Disclaimer</h2>
        <p class="text-sm text-muted/60">
          Liability limitations and intellectual property
        </p>
      </div>
      <div class="prose dark:prose-invert max-w-none space-y-6">
        <UCard
          v-for="section in legal.disclaimer.sections"
          :key="section.title"
        >
          <h3>{{ section.title }}</h3>
          <p>{{ withYear(section.content) }}</p>
        </UCard>

        <UCard>
          <h3>{{ legal.disclaimer.openSource.title }}</h3>
          <p>
            The <strong>source code</strong> of this website is released as open
            source under the MIT licence.
          </p>
          <pre
            class="text-xs leading-relaxed bg-muted/10 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap"
            >{{ withYear(legal.disclaimer.openSource.licenseText) }}</pre
          >
          <p class="text-sm text-muted/70 mt-3">
            Source code is available on
            <a
              :href="legal.disclaimer.openSource.githubUrl"
              target="_blank"
              rel="noopener"
              >GitHub</a
            >. {{ legal.disclaimer.openSource.note }}
          </p>
        </UCard>
      </div>
    </section>

    <p class="text-xs text-muted/40 border-t border-muted/10 pt-8">
      Questions about this page? Use the
      <NuxtLink to="/contact" class="underline hover:text-foreground transition"
        >contact form</NuxtLink
      >.
    </p>
  </UContainer>
</template>
