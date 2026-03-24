<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

const { login } = useAuth()
const { data: ui } = await useUiContent()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="ui?.auth.signInTitle ?? 'Sign in to continue'"
    :description="ui?.auth.signInDescription ?? ''"
  >
    <template #body>
      <div class="flex flex-col gap-3 px-1 pb-2">
        <UButton
          :label="ui?.auth.providers.github ?? 'Continue with GitHub'"
          icon="i-simple-icons-github"
          size="lg"
          color="neutral"
          variant="outline"
          class="justify-start"
          @click="login('github')"
        />
        <UButton
          :label="ui?.auth.providers.google ?? 'Continue with Google'"
          icon="i-simple-icons-google"
          size="lg"
          color="neutral"
          variant="outline"
          class="justify-start"
          @click="login('google')"
        />
        <UButton
          :label="ui?.auth.providers.linkedin ?? 'Continue with LinkedIn'"
          icon="i-simple-icons-linkedin"
          size="lg"
          color="neutral"
          variant="outline"
          class="justify-start"
          @click="login('linkedin')"
        />
      </div>
    </template>
  </UModal>
</template>
