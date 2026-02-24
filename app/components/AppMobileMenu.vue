<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

defineProps<{
  navigation: Array<{ label: string; to: string }>
  secondaryNavigation: Array<{ label: string; to: string }>
}>()

const emit = defineEmits<{
  'sign-in': []
}>()

const runtimeConfig = useRuntimeConfig()
const mailtoLink = `mailto:${runtimeConfig.public.contactEmail}`

function close() {
  open.value = false
}

function handleSignIn() {
  emit('sign-in')
  close()
}
</script>

<template>
  <USlideover v-model:open="open" side="right" title="Navigate" class="md:hidden">
    <template #body>
      <div class="flex flex-col gap-1">
        <NavLinks
          :items="navigation"
          orientation="vertical"
          @navigate="close"
        />

        <UButton
          to="/book"
          label="~/book"
          icon="i-lucide-calendar"
          size="lg"
          variant="ghost"
          class="justify-start px-4 py-3 text-base font-medium"
          @click="close"
        />

        <a
          :href="mailtoLink"
          class="px-4 py-3 rounded-xl text-base font-medium transition hover:bg-muted/80"
          @click="close"
        >
          ~/email
        </a>

        <USeparator class="my-3" />

        <NavLinks
          :items="secondaryNavigation"
          orientation="vertical"
          @navigate="close"
        />
      </div>
    </template>

    <template #footer>
      <AuthButtons @sign-in="handleSignIn" />
    </template>
  </USlideover>
</template>
