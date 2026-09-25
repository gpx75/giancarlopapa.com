<script setup lang="ts">
import type { JobApplication } from '~/types/applications';
import { zurichMonthKey } from '~~/shared/utils/rav-date';

definePageMeta({ layout: 'admin' });
useSeoMeta({ title: 'Admin — RAV reports', robots: 'noindex, nofollow' });

const { data: apps } = await useAsyncData('rav-applications', () =>
  $fetch<JobApplication[]>('/api/admin/applications')
);

const months = computed(() => {
  const counts = new Map<string, number>();
  for (const a of apps.value ?? []) {
    if (!a.applied_at) continue;
    const key = zurichMonthKey(a.applied_at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, count]) => ({ month, count }));
});
</script>

<template>
  <UDashboardPanel id="rav">
    <template #header>
      <UDashboardNavbar title="RAV reports" />
    </template>
    <template #body>
      <p class="text-sm text-muted mb-4 max-w-prose">
        One "Nachweis der persönlichen Arbeitsbemühungen" per month, filled from
        applications by their applied date.
      </p>
      <UAlert
        v-if="!months.length"
        color="neutral"
        variant="soft"
        title="No applications with an applied date yet."
      />
      <ul v-else class="space-y-2 max-w-prose">
        <li v-for="m in months" :key="m.month">
          <UCard>
            <div class="flex items-center justify-between gap-3">
              <div>
                <span class="font-mono">{{ m.month }}</span>
                <span class="text-sm text-muted ml-2">
                  {{ m.count }} application{{ m.count === 1 ? '' : 's' }}
                </span>
              </div>
              <UButton
                :to="`/api/admin/rav/${m.month}`"
                external
                download
                size="sm"
                icon="i-lucide-download"
                label="Excel (.xlsm)"
              />
            </div>
          </UCard>
        </li>
      </ul>
    </template>
  </UDashboardPanel>
</template>
