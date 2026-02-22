<script setup lang="ts">
interface CvContactCtaProps {
  headline: string
  subline: string
}

const props = defineProps<CvContactCtaProps>()

const { user, loggedIn } = useAuth()

const form = reactive({
  name: '',
  email: '',
  message: ''
})

watch(loggedIn, (isLoggedIn) => {
  if (isLoggedIn && user.value) {
    form.name = form.name || user.value.name || ''
    form.email = form.email || user.value.email || ''
  }
}, { immediate: true })

const loading = ref(false)
const status = ref<'idle' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function handleSubmit() {
  loading.value = true
  status.value = 'idle'
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: { name: form.name, email: form.email, message: form.message }
    })
    status.value = 'success'
  } catch (err: unknown) {
    status.value = 'error'
    errorMessage.value = (err as { data?: { message?: string } })?.data?.message ?? 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section id="contact" class="grid gap-10 lg:grid-cols-2 lg:gap-16">
    <div class="space-y-4">
      <UBadge
        color="neutral"
        variant="soft"
        class="uppercase tracking-wider text-xs"
      >
        Contact
      </UBadge>
      <h2>
        {{ props.headline }}
      </h2>
      <p class="text-muted/80">
        {{ props.subline }}
      </p>
    </div>

    <div>
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        mode="out-in"
      >
        <div
          v-if="status === 'success'"
          class="flex h-full flex-col items-start justify-center gap-3 rounded-2xl border border-muted/20 bg-muted/5 px-8 py-10"
        >
          <UIcon name="i-lucide-circle-check" class="size-8 text-primary" />
          <div class="space-y-1">
            <p class="text-lg font-semibold">
              Message sent!
            </p>
            <p class="text-muted/80">
              Thanks for reaching out — I'll get back to you soon.
            </p>
          </div>
        </div>

        <AuthWall
          v-else-if="!loggedIn"
          title="Sign in to send a message"
          description="One click with your existing account — no new password needed."
        />

        <form
          v-else
          class="space-y-5"
          @submit.prevent="handleSubmit"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Name">
              <UInput
                v-model="form.name"
                placeholder="Your name"
                size="lg"
                required
                :disabled="loading"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Email">
              <UInput
                v-model="form.email"
                type="email"
                placeholder="you@example.com"
                size="lg"
                required
                :disabled="loading"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Message">
            <UTextarea
              v-model="form.message"
              placeholder="What's on your mind?"
              :rows="5"
              size="lg"
              required
              :disabled="loading"
              class="w-full"
            />
          </UFormField>

          <div class="flex flex-col gap-3">
            <UButton
              type="submit"
              label="Send message"
              size="lg"
              color="primary"
              icon="i-lucide-send"
              :loading="loading"
            />
            <UAlert
              v-if="status === 'error'"
              color="error"
              variant="soft"
              icon="i-lucide-circle-x"
              title="Failed to send"
              :description="errorMessage"
            />
          </div>
        </form>
      </Transition>
    </div>
  </section>
</template>
