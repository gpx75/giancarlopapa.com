<script setup lang="ts">
export interface RunActivity {
  id: number
  name: string
  sport_type: string
  start_date_local: string
  distance: number
  moving_time: number
  total_elevation_gain: number
  average_speed: number
  average_heartrate: number | null
  summary_polyline: string
}

const props = defineProps<{ activity: RunActivity }>()

const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun', 'Treadmill'])
const CYCLE_TYPES = new Set(['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide', 'EBikeRide'])

const isRunType = computed(() => RUN_TYPES.has(props.activity.sport_type))
const isCycleType = computed(() => CYCLE_TYPES.has(props.activity.sport_type))

const distanceKm = computed(() => (props.activity.distance / 1000).toFixed(2))

// Pace (min/km) for runs, speed (km/h) for other activities
const speedLabel = computed(() => {
  if (props.activity.average_speed === 0) return '—'
  if (isRunType.value) {
    const secPerKm = 1000 / props.activity.average_speed
    const min = Math.floor(secPerKm / 60)
    const sec = Math.round(secPerKm % 60)
    return `${min}:${String(sec).padStart(2, '0')} /km`
  }
  return `${(props.activity.average_speed * 3.6).toFixed(1)} km/h`
})

const duration = computed(() => {
  const s = props.activity.moving_time
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
})

const date = computed(() => {
  const d = new Date(props.activity.start_date_local)
  return d.toLocaleDateString('en-CH', { day: 'numeric', month: 'short', year: 'numeric' })
})

const elevationM = computed(() => Math.round(props.activity.total_elevation_gain))

// Sport type display label
const sportLabel = computed(() => {
  const map: Record<string, string> = {
    Run: 'Run', TrailRun: 'Trail Run', VirtualRun: 'Virtual Run', Treadmill: 'Treadmill',
    Ride: 'Ride', VirtualRide: 'Virtual Ride', MountainBikeRide: 'MTB', GravelRide: 'Gravel',
    EBikeRide: 'E-Bike', Walk: 'Walk', Hike: 'Hike', Swim: 'Swim',
    WeightTraining: 'Weights', Yoga: 'Yoga', Workout: 'Workout'
  }
  return map[props.activity.sport_type] ?? props.activity.sport_type
})

const sportColor = computed(() => {
  if (isRunType.value) return 'text-terminal-400'
  if (isCycleType.value) return 'text-primary'
  return 'text-muted/60'
})
</script>

<template>
  <div class="rounded-xl border border-muted/15 bg-muted/5 overflow-hidden flex flex-col">
    <!-- Map -->
    <ClientOnly v-if="activity.summary_polyline">
      <RunsActivityMap :polyline="activity.summary_polyline" />
      <template #fallback>
        <div class="h-36 bg-muted/10 animate-pulse" />
      </template>
    </ClientOnly>
    <div v-else class="h-36 flex items-center justify-center bg-muted/10">
      <UIcon name="i-lucide-map-off" class="size-6 text-muted/30" />
    </div>

    <!-- Stats -->
    <div class="px-4 py-3 space-y-3">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-medium" :class="sportColor">{{ sportLabel }}</span>
          <span class="text-xs text-muted/30">·</span>
          <p class="text-xs text-muted/50 font-mono">{{ date }}</p>
        </div>
        <p class="text-sm font-semibold truncate mt-0.5">{{ activity.name }}</p>
      </div>

      <div class="grid grid-cols-2 gap-x-4 gap-y-2">
        <div v-if="activity.distance > 0">
          <p class="text-xs text-muted/40 uppercase tracking-wider">Distance</p>
          <p class="text-sm font-mono font-medium text-terminal-400">{{ distanceKm }} km</p>
        </div>
        <div>
          <p class="text-xs text-muted/40 uppercase tracking-wider">{{ isRunType ? 'Pace' : 'Speed' }}</p>
          <p class="text-sm font-mono font-medium">{{ speedLabel }}</p>
        </div>
        <div>
          <p class="text-xs text-muted/40 uppercase tracking-wider">Time</p>
          <p class="text-sm font-mono font-medium">{{ duration }}</p>
        </div>
        <div v-if="elevationM > 0">
          <p class="text-xs text-muted/40 uppercase tracking-wider">Elevation</p>
          <p class="text-sm font-mono font-medium">{{ elevationM }} m</p>
        </div>
        <div v-if="activity.average_heartrate">
          <p class="text-xs text-muted/40 uppercase tracking-wider">Avg HR</p>
          <p class="text-sm font-mono font-medium text-magenta-400">{{ Math.round(activity.average_heartrate) }} bpm</p>
        </div>
      </div>
    </div>
  </div>
</template>
