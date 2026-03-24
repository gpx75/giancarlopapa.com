<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; to: string }>;
  orientation?: 'horizontal' | 'vertical';
}>();

const emit = defineEmits<{
  navigate: [];
}>();

const route = useRoute();

function isActive(to: string) {
  if (to === '/') return route.path === '/';
  return route.path.startsWith(to);
}
</script>

<template>
  <nav
    :class="
      orientation === 'vertical'
        ? 'flex flex-col gap-1'
        : 'flex items-center gap-1'
    "
  >
    <ULink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      :active="isActive(item.to)"
      :class="[
        orientation === 'vertical'
          ? 'px-4 py-3 rounded-xl text-base font-medium'
          : 'px-3 py-2 text-sm rounded-full'
      ]"
      active-class="text-primary bg-primary/10 font-medium"
      inactive-class="hover:bg-elevated/50"
      @click="emit('navigate')"
    >
      {{ item.label }}
    </ULink>
  </nav>
</template>
