<script setup lang="ts">
import type {
  ResumeEducation,
  ResumeInterest,
  ResumeLanguage,
  ResumeSkill,
  ResumeWork
} from '~/types/resume';

const { resume, pending, error, refresh } = useResumeContent();
const { loggedIn } = useAuth();

const basics = computed(() => resume.value?.basics);
const work = computed<ResumeWork[]>(() => resume.value?.work ?? []);
const education = computed<ResumeEducation[]>(
  () => resume.value?.education ?? []
);
const skills = computed<ResumeSkill[]>(() => resume.value?.skills ?? []);
const languages = computed<ResumeLanguage[]>(
  () => resume.value?.languages ?? []
);
const interests = computed<ResumeInterest[]>(
  () => resume.value?.interests ?? []
);

const hasAnyContent = computed(() => Boolean(resume.value));

function asDate(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.toLowerCase() === 'present') {
    return 'Present';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

function formatDateRange(start?: string, end?: string) {
  const startLabel = asDate(start);
  const endLabel = asDate(end) ?? 'Present';

  if (!startLabel) {
    return endLabel;
  }

  return `${startLabel} — ${endLabel}`;
}

function profileIcon(network?: string) {
  if (!network) {
    return 'i-lucide-globe';
  }

  const normalized = network.toLowerCase();
  if (normalized === 'github') {
    return 'i-simple-icons-github';
  }
  if (normalized === 'linkedin') {
    return 'i-simple-icons-linkedin';
  }

  return 'i-lucide-globe';
}
</script>

<template>
  <UContainer class="space-y-12 py-16 lg:space-y-16 lg:py-16">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <UBadge color="neutral" variant="soft" class="tracking-wider text-xs">
          <span><span class="text-terminal-400/60">~/</span>resume</span>
        </UBadge>
        <h1>
          {{ basics?.name || 'Resume' }}
        </h1>
      </div>
      <UButton
        to="/"
        icon="i-lucide-arrow-left"
        label="Back home"
        variant="ghost"
        color="neutral"
      />
    </div>

    <div class="rounded-2xl border border-muted/20 bg-muted/5 p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <p class="font-semibold">
            Download CV
          </p>
          <p class="text-sm text-muted/80">
            Sign in to download the PDF version of my resume.
          </p>
        </div>
        <div v-if="loggedIn" class="shrink-0">
          <UButton
            to="/giancarlo_papa_resume.pdf"
            target="_blank"
            label="Download CV"
            icon="i-lucide-download"
            color="primary"
            variant="solid"
            external
          />
        </div>
        <div v-else class="shrink-0">
          <AuthWall
            title="Sign in to download"
            description="One click — no new password needed."
          />
        </div>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error?.message || `We couldn't load the resume`"
      description="Please try again."
      :actions="[{ label: 'Retry', color: 'error', onClick: () => refresh() }]"
      icon="i-lucide-alert-triangle"
    />

    <div v-else-if="pending" class="space-y-8">
      <USkeleton class="h-32 rounded-3xl" />
      <USkeleton class="h-24 rounded-3xl" />
      <USkeleton class="h-24 rounded-3xl" />
    </div>

    <div v-else-if="hasAnyContent" class="space-y-12">
      <section class="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div class="space-y-6">
          <div class="space-y-3">
            <h2>
              {{ basics?.label }}
            </h2>
            <p
              v-if="basics?.summary"
              class="text-lg leading-relaxed text-muted/80"
            >
              {{ basics.summary }}
            </p>
          </div>
          <div class="grid gap-3 text-sm text-muted">
            <div v-if="basics?.email" class="flex items-center gap-3">
              <UIcon name="i-lucide-mail" class="text-base" />
              <a
                :href="`mailto:${basics.email}`"
                class="transition hover:text-foreground"
              >
                {{ basics.email }}
              </a>
            </div>
            <div v-if="basics?.phone" class="flex items-center gap-3">
              <UIcon name="i-lucide-phone" class="text-base" />
              <a
                :href="`tel:${basics.phone}`"
                class="transition hover:text-foreground"
              >
                {{ basics.phone }}
              </a>
            </div>
            <div v-if="basics?.location" class="flex items-start gap-3">
              <UIcon name="i-lucide-map-pin" class="mt-0.5 text-base" />
              <span>
                {{
                  [basics.location.city, basics.location.region]
                    .filter(Boolean)
                    .join(' · ')
                }}
                <template v-if="basics.location.countryCode">
                  <span v-if="basics.location.city || basics.location.region">
                    ·
                  </span>
                  {{ basics.location.countryCode }}
                </template>
              </span>
            </div>
            <div v-if="basics?.url" class="flex items-center gap-3">
              <UIcon name="i-lucide-globe" class="text-base" />
              <a
                :href="basics.url"
                target="_blank"
                rel="noopener"
                class="transition hover:text-foreground"
              >
                {{ basics.url }}
              </a>
            </div>
          </div>
        </div>

        <UCard v-if="basics?.profiles?.length" class="space-y-4">
          <template #header>
            <h3>Profiles</h3>
          </template>
          <div class="flex flex-col gap-2">
            <UButton
              v-for="profileLink in basics.profiles"
              :key="profileLink.network"
              :label="profileLink.network"
              :to="profileLink.url"
              :icon="profileIcon(profileLink.network)"
              variant="ghost"
              color="neutral"
              class="justify-start"
              target="_blank"
            />
          </div>
        </UCard>
      </section>

      <section v-if="work.length" class="space-y-6">
        <CvSectionHeading
          title="Experience"
          description="Roles and projects that shaped my expertise."
          kicker="Work"
        />
        <div class="space-y-4">
          <UCard
            v-for="item in work"
            :key="`${item.name}-${item.startDate}`"
            class="space-y-4"
          >
            <div
              class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between"
            >
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3>
                    {{ item.position }}
                  </h3>
                  <UBadge v-if="item.name" color="neutral" variant="subtle">
                    {{ item.name }}
                  </UBadge>
                </div>
                <p v-if="item.location" class="text-sm text-muted/80">
                  {{ item.location }}
                </p>
              </div>
              <p class="text-sm font-medium text-muted/80">
                {{ formatDateRange(item.startDate, item.endDate) }}
              </p>
            </div>
            <p v-if="item.summary" class="text-muted">
              {{ item.summary }}
            </p>
            <ul
              v-if="item.highlights?.length"
              class="list-disc space-y-2 pl-5 text-muted/90"
            >
              <li v-for="highlight in item.highlights" :key="highlight">
                {{ highlight }}
              </li>
            </ul>
            <template v-if="item.url">
              <UDivider />
              <UButton
                :to="item.url"
                target="_blank"
                rel="noopener"
                label="Visit company"
                icon="i-lucide-external-link"
                variant="ghost"
                color="neutral"
                class="justify-start"
              />
            </template>
          </UCard>
        </div>
      </section>

      <section v-if="education.length" class="space-y-6">
        <CvSectionHeading
          title="Education"
          description="Formal studies and certifications."
          kicker="Education"
        />
        <div class="space-y-4">
          <UCard
            v-for="item in education"
            :key="`${item.institution}-${item.startDate}`"
            class="space-y-2"
          >
            <div
              class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between"
            >
              <div>
                <h3>
                  {{ item.institution }}
                </h3>
                <p
                  v-if="item.studyType || item.area"
                  class="text-sm text-muted/80"
                >
                  {{ [item.studyType, item.area].filter(Boolean).join(' · ') }}
                </p>
                <p v-if="item.location" class="text-sm text-muted/80">
                  {{ item.location }}
                </p>
              </div>
              <p class="text-sm font-medium text-muted/80">
                {{ formatDateRange(item.startDate, item.endDate) }}
              </p>
            </div>
          </UCard>
        </div>
      </section>

      <section v-if="skills.length" class="space-y-6">
        <CvSectionHeading
          title="Skills"
          description="Core technologies and competencies."
          kicker="Expertise"
        />
        <div class="grid gap-4 md:grid-cols-2">
          <UCard v-for="skill in skills" :key="skill.name" class="space-y-3">
            <div class="flex items-center justify-between">
              <h3>
                {{ skill.name }}
              </h3>
              <UBadge v-if="skill.level" color="neutral" variant="soft">
                {{ skill.level }}
              </UBadge>
            </div>
            <div
              v-if="skill.keywords?.length"
              class="flex flex-wrap gap-2 text-sm text-muted/90"
            >
              <span
                v-for="keyword in skill.keywords"
                :key="keyword"
                class="rounded-full bg-muted/20 px-3 py-1"
              >
                {{ keyword }}
              </span>
            </div>
          </UCard>
        </div>
      </section>

      <section v-if="languages.length" class="space-y-6">
        <CvSectionHeading title="Languages" kicker="Communication" />
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <UCard
            v-for="language in languages"
            :key="language.language"
            class="space-y-1"
          >
            <h3>
              {{ language.language }}
            </h3>
            <p v-if="language.fluency" class="text-sm text-muted/80">
              {{ language.fluency }}
            </p>
          </UCard>
        </div>
      </section>

      <section v-if="interests.length" class="space-y-6">
        <CvSectionHeading
          title="Interests"
          description="What keeps me energized beyond the editor."
          kicker="Personal"
        />
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <UCard
            v-for="interest in interests"
            :key="interest.name"
            class="space-y-2"
          >
            <h3>
              {{ interest.name }}
            </h3>
            <div
              v-if="interest.keywords?.length"
              class="flex flex-wrap gap-2 text-sm text-muted/90"
            >
              <span
                v-for="keyword in interest.keywords"
                :key="keyword"
                class="rounded-full bg-muted/20 px-3 py-1"
              >
                {{ keyword }}
              </span>
            </div>
          </UCard>
        </div>
      </section>
    </div>
  </UContainer>
</template>
