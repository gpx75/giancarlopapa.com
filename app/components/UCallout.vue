<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import type { PropType } from 'vue'

const SOFT_CLASS_MAP: Record<string, string> = {
  primary: 'border-primary/20 bg-primary/10 text-primary',
  info: 'border-info/20 bg-info/10 text-info',
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  error: 'border-error/20 bg-error/10 text-error',
  neutral: 'border-muted/30 bg-muted/10 text-muted/90'
}

const SOLID_CLASS_MAP: Record<string, string> = {
  primary: 'border-primary bg-primary text-primary-foreground',
  info: 'border-info bg-info text-info-foreground',
  success: 'border-success bg-success text-success-foreground',
  warning: 'border-warning bg-warning text-warning-foreground',
  error: 'border-error bg-error text-error-foreground'
}

interface VariantConfig {
  (color: string): string
}

const props = defineProps({
  icon: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'primary'
  },
  variant: {
    type: String as PropType<'soft' | 'solid' | 'outline' | 'ghost'>,
    default: 'soft'
  }
})

const attrs = useAttrs()

const computeVariantClass: VariantConfig = (color) => {
  if (props.variant === 'solid') {
    return SOLID_CLASS_MAP[color] || 'border-primary bg-primary text-primary-foreground'
  }
  if (props.variant === 'outline') {
    return 'border-muted/30 bg-transparent text-foreground'
  }
  if (props.variant === 'ghost') {
    return 'border-transparent bg-transparent text-foreground'
  }
  return SOFT_CLASS_MAP[color] || 'border-primary/20 bg-primary/10 text-primary'
}

const variantClass = computed(() => computeVariantClass(props.color))
</script>

<template>
  <section
    v-bind="attrs"
    :class="['relative overflow-hidden rounded-3xl border p-6', variantClass]"
  >
    <div class="flex flex-col gap-4">
      <div
        v-if="props.icon"
        class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-2xl shadow-sm"
      >
        <UIcon
          :name="props.icon"
          aria-hidden="true"
        />
      </div>
      <slot />
    </div>
  </section>
</template>
