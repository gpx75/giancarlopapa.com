<script setup lang="ts">
const props = defineProps({
  label: {
    type: String,
    default: ''
  }
})

const attrs = useAttrs()
</script>

<template>
  <div
    v-bind="attrs"
    class="flex items-center gap-3"
  >
    <span class="h-px flex-1 bg-muted/30" />
    <span
      v-if="props.label"
      class="text-xs font-medium uppercase tracking-widest text-muted"
    >
      {{ props.label }}
    </span>
    <span class="h-px flex-1 bg-muted/30" />
  </div>
</template>
