<script setup lang="ts">
definePageMeta({ layout: 'admin' });
useSeoMeta({
  title: 'Admin — Pipeline Analytics',
  robots: 'noindex, nofollow'
});

interface AnalyticsResponse {
  total_applications: number;
  stage_counts: Record<string, number>;
  status_counts: Record<string, number>;
  stage_avg_ms: Record<string, number | null>;
  win_rate: number | null;
  decided_count: number;
  offers_count: number;
  sources: Array<{
    source: string;
    total: number;
    offers: number;
    offer_rate: number;
    avg_match: number | null;
  }>;
  recent: { created: number; applied: number; decided: number };
}

const { data, pending, refresh } = await useFetch<AnalyticsResponse>(
  '/api/admin/analytics',
  {
    key: 'admin-analytics'
  }
);

const STAGES = [
  { key: 'analyze', label: 'Analyze' },
  { key: 'prioritize', label: 'Prioritize' },
  { key: 'cv', label: 'CV' },
  { key: 'cover_letter', label: 'Cover letter' },
  { key: 'review', label: 'Review' },
  { key: 'apply', label: 'Apply' },
  { key: 'interview_prep', label: 'Interview prep' },
  { key: 'closed', label: 'Closed' }
] as const;

const maxStageCount = computed(() => {
  if (!data.value) return 0;
  return Math.max(
    1,
    ...STAGES.map((s) => data.value!.stage_counts[s.key] ?? 0)
  );
});

function fmtDuration(ms: number | null) {
  if (ms == null) return '—';
  const days = ms / (24 * 60 * 60 * 1000);
  if (days >= 1) return `${days.toFixed(1)}d`;
  const hours = ms / (60 * 60 * 1000);
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  const mins = ms / 60_000;
  return `${Math.max(1, Math.round(mins))}m`;
}

const STATUS_COLOR: Record<
  string,
  'neutral' | 'info' | 'success' | 'warning' | 'error'
> = {
  saved: 'neutral',
  applied: 'info',
  interviewing: 'warning',
  offered: 'success',
  accepted: 'success',
  rejected: 'error',
  withdrawn: 'neutral'
};
</script>

<template>
  <UDashboardPanel id="admin-analytics-panel">
    <template #header>
      <UDashboardNavbar title="Pipeline analytics" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            size="sm"
            variant="ghost"
            color="neutral"
            :loading="pending"
            @click="refresh()"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="pending && !data"
        class="p-6 flex items-center gap-2 text-sm text-muted"
      >
        <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
        Loading…
      </div>

      <div
        v-else-if="!data || data.total_applications === 0"
        class="p-12 text-center"
      >
        <UIcon
          name="i-lucide-bar-chart-3"
          class="size-10 text-muted opacity-30 mx-auto mb-3"
        />
        <p class="text-sm text-muted">
          No applications yet — analytics will appear once you start tracking.
        </p>
      </div>

      <div v-else class="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
        <!-- KPI cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <UCard variant="soft">
            <div class="text-xs text-muted uppercase tracking-wide font-mono">
              Total
            </div>
            <div class="text-3xl font-bold mt-1">
              {{ data.total_applications }}
            </div>
            <div class="text-xs text-muted mt-1">applications</div>
          </UCard>
          <UCard variant="soft">
            <div class="text-xs text-muted uppercase tracking-wide font-mono">
              Win rate
            </div>
            <div class="text-3xl font-bold mt-1">
              <span v-if="data.win_rate != null">{{ data.win_rate }}%</span>
              <span v-else class="text-muted">—</span>
            </div>
            <div class="text-xs text-muted mt-1">
              {{ data.offers_count }} offer{{
                data.offers_count === 1 ? '' : 's'
              }}
              / {{ data.decided_count }} decided
            </div>
          </UCard>
          <UCard variant="soft">
            <div class="text-xs text-muted uppercase tracking-wide font-mono">
              Last 30 days
            </div>
            <div class="text-3xl font-bold mt-1">{{ data.recent.created }}</div>
            <div class="text-xs text-muted mt-1">
              {{ data.recent.applied }} applied ·
              {{ data.recent.decided }} decided
            </div>
          </UCard>
          <UCard variant="soft">
            <div class="text-xs text-muted uppercase tracking-wide font-mono">
              Active
            </div>
            <div class="text-3xl font-bold mt-1">
              {{ data.total_applications - (data.stage_counts.closed ?? 0) }}
            </div>
            <div class="text-xs text-muted mt-1">in pipeline</div>
          </UCard>
        </div>

        <!-- Stage funnel -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-filter" class="text-primary-500" />
              <h3 class="font-semibold">Stage funnel</h3>
              <span class="text-xs text-muted ml-auto"
                >current count + avg time-in-stage</span
              >
            </div>
          </template>
          <ul class="space-y-2">
            <li
              v-for="s in STAGES"
              :key="s.key"
              class="grid grid-cols-[10rem_1fr_4rem_4rem] items-center gap-3 cursor-pointer rounded-md hover:bg-elevated/40 px-2 py-1 transition-colors"
              :title="`Filter applications by ${s.label}`"
              @click="navigateTo(`/admin/applications?stage=${s.key}`)"
            >
              <span class="text-sm font-mono truncate">{{ s.label }}</span>
              <div
                class="h-6 bg-elevated/60 rounded-md relative overflow-hidden"
              >
                <div
                  class="h-full bg-primary-500/70 transition-all"
                  :style="{
                    width: maxStageCount
                      ? `${((data.stage_counts[s.key] ?? 0) / maxStageCount) * 100}%`
                      : '0%'
                  }"
                />
              </div>
              <span class="text-sm tabular-nums text-right">{{
                data.stage_counts[s.key] ?? 0
              }}</span>
              <span class="text-xs text-muted tabular-nums text-right">{{
                fmtDuration(data.stage_avg_ms[s.key] ?? null)
              }}</span>
            </li>
          </ul>
        </UCard>

        <!-- Status breakdown + Source effectiveness -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-pie-chart" class="text-primary-500" />
                <h3 class="font-semibold">Status breakdown</h3>
              </div>
            </template>
            <ul class="space-y-2">
              <li
                v-for="(count, status) in data.status_counts"
                :key="status"
                class="flex items-center gap-2 cursor-pointer rounded-md hover:bg-elevated/40 px-2 py-1 transition-colors"
                :title="`Filter applications by status ${status}`"
                @click="navigateTo(`/admin/applications?status=${status}`)"
              >
                <UBadge
                  :label="status"
                  :color="STATUS_COLOR[status] ?? 'neutral'"
                  variant="subtle"
                  size="xs"
                />
                <div
                  class="flex-1 h-2 bg-elevated/60 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-primary-500/60"
                    :style="{
                      width: `${(count / data.total_applications) * 100}%`
                    }"
                  />
                </div>
                <span class="text-sm tabular-nums w-10 text-right">{{
                  count
                }}</span>
              </li>
            </ul>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-target" class="text-primary-500" />
                <h3 class="font-semibold">Source effectiveness</h3>
              </div>
            </template>
            <div
              v-if="data.sources.length === 0"
              class="text-sm text-muted italic"
            >
              No source data yet.
            </div>
            <table v-else class="w-full text-sm">
              <thead>
                <tr
                  class="text-xs text-muted uppercase tracking-wide font-mono"
                >
                  <th class="text-left py-1 font-normal">Source</th>
                  <th class="text-right py-1 font-normal">#</th>
                  <th class="text-right py-1 font-normal">Offers</th>
                  <th class="text-right py-1 font-normal">Rate</th>
                  <th class="text-right py-1 font-normal">Match avg</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="src in data.sources"
                  :key="src.source"
                  class="border-t border-default"
                >
                  <td class="py-1.5 font-mono truncate max-w-40">
                    {{ src.source }}
                  </td>
                  <td class="py-1.5 text-right tabular-nums">
                    {{ src.total }}
                  </td>
                  <td class="py-1.5 text-right tabular-nums">
                    {{ src.offers }}
                  </td>
                  <td class="py-1.5 text-right tabular-nums">
                    <span
                      :class="
                        src.offer_rate >= 30
                          ? 'text-success'
                          : src.offer_rate > 0
                            ? 'text-warning'
                            : 'text-muted'
                      "
                    >
                      {{ src.offer_rate }}%
                    </span>
                  </td>
                  <td class="py-1.5 text-right tabular-nums text-muted">
                    {{ src.avg_match != null ? `${src.avg_match}%` : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
