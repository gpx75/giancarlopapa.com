<script setup lang="ts">
interface Props {
  title?: string
  description?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Sign in to continue',
  description: 'Use your existing account — no new password needed.'
})

const { login } = useAuth()
</script>

<template>
  <div class="space-y-6 rounded-2xl border border-muted/20 bg-muted/5 px-8 py-10">
    <div class="space-y-1">
      <p class="text-lg font-semibold">
        {{ props.title }}
      </p>
      <p class="text-sm text-muted/80">
        {{ props.description }}
      </p>
    </div>
    <div class="flex flex-col gap-3">
      <UButton
        label="Continue with GitHub"
        icon="i-simple-icons-github"
        size="lg"
        color="neutral"
        variant="outline"
        class="justify-start"
        @click="login('github')"
      />
      <UButton
        label="Continue with Google"
        icon="i-simple-icons-google"
        size="lg"
        color="neutral"
        variant="outline"
        class="justify-start"
        @click="login('google')"
      />
      <UButton
        label="Continue with LinkedIn"
        icon="i-simple-icons-linkedin"
        size="lg"
        color="neutral"
        variant="outline"
        class="justify-start"
        @click="login('linkedin')"
      />
    </div>
  </div>
</template>
