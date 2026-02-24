<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

const { login } = useAuth()
</script>

<template>
  <UModal
    v-model:open="open"
    title="Sign in to continue"
    description="Use your existing account — no new password needed."
  >
    <template #body>
      <div class="flex flex-col gap-3 px-1 pb-2">
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
    </template>
  </UModal>
</template>
