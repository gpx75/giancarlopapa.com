<script setup lang="ts">
defineProps<{
  compact?: boolean
}>()

const emit = defineEmits<{
  'sign-in': []
}>()

const { user, loggedIn, logout } = useAuth()
</script>

<template>
  <!-- Desktop: compact icon-only layout -->
  <div v-if="compact" class="flex items-center gap-1">
    <template v-if="loggedIn">
      <UAvatar :src="user?.avatar" :alt="user?.name" size="sm" />
      <UButton
        icon="i-lucide-log-out"
        aria-label="Sign out"
        variant="ghost"
        color="neutral"
        size="sm"
        @click="logout()"
      />
    </template>
    <UButton
      v-else
      label="Sign in"
      icon="i-lucide-log-in"
      size="sm"
      variant="ghost"
      color="neutral"
      @click="emit('sign-in')"
    />
  </div>

  <!-- Mobile: full-width with labels -->
  <div v-else>
    <div v-if="loggedIn" class="flex items-center gap-3">
      <UAvatar :src="user?.avatar" :alt="user?.name" size="sm" />
      <span class="text-sm font-medium flex-1 truncate">{{ user?.name }}</span>
      <UButton
        label="Sign out"
        icon="i-lucide-log-out"
        size="xs"
        variant="ghost"
        color="neutral"
        @click="logout()"
      />
    </div>
    <UButton
      v-else
      label="Sign in"
      icon="i-lucide-log-in"
      size="sm"
      variant="outline"
      color="neutral"
      class="w-full justify-start"
      @click="emit('sign-in')"
    />
  </div>
</template>
