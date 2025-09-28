<script setup lang="ts">
const { profile, source, pending, error, refresh } = useProfileData()
</script>

<template>
  <UContainer class="space-y-16 py-12 lg:space-y-20 lg:py-16">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="We could not load the latest data"
      description="Serving the built-in profile instead. Refresh once your NuxtHub database is reachable."
      icon="i-lucide-alert-triangle"
      :actions="[{ label: 'Retry', color: 'error', onSelect: refresh }]"
    />

    <UAlert
      v-else-if="source === 'hub-kv' && !pending"
      color="info"
      variant="soft"
      title="Serving cached profile"
      description="Content is coming from NuxtHub KV. Update the database to refresh the cache."
      icon="i-lucide-database"
    />

    <UAlert
      v-else-if="source === 'static' && !pending"
      color="warning"
      variant="soft"
      title="Using the locally bundled profile"
      description="Seed your NuxtHub database or push a record to NuxtHub KV to serve live data."
      icon="i-lucide-database"
    />

    <CvHero
      :hero="profile.hero"
      :stats="profile.stats"
      :source="source"
    />

    <section
      id="experience"
      class="space-y-10"
    >
      <CvSectionHeading
        title="Impact through experience"
        description="A decade of product engineering spanning SaaS, analytics, and developer tooling."
        kicker="Experience"
      />
      <CvExperienceTimeline :experience="profile.experience" />
    </section>

    <section
      id="projects"
      class="space-y-10"
    >
      <CvSectionHeading
        title="Selected projects"
        description="Hands-on initiatives where NuxtHub, Supabase, and thoughtful UX met ambitious timelines."
        kicker="Projects"
      />
      <CvProjectsGrid :projects="profile.projects" />
    </section>

    <section
      id="skills"
      class="space-y-10"
    >
      <CvSectionHeading
        title="Where I add the most leverage"
        description="From shipping revenue-critical surfaces to building foundations teams can trust."
        kicker="Capabilities"
      />
      <CvSkillsGrid :skills="profile.skills" />
    </section>

    <section
      id="writing"
      class="space-y-10"
    >
      <CvSectionHeading
        title="Writing"
        description="Practical essays on edge architecture, product delivery, and team enablement."
        kicker="Notes from the field"
      />
      <CvWritingList :entries="profile.writing" />
    </section>

    <CvContactCta
      :headline="profile.contact.headline"
      :subline="profile.contact.subline"
      :cta="profile.contact.cta"
    />
  </UContainer>
</template>
