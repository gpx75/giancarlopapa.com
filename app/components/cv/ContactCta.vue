<script setup lang="ts">
interface CvContactCtaProps {
  headline: string;
  subline: string;
}

const props = defineProps<CvContactCtaProps>();

const { user, loggedIn } = useAuth();
const { data: ui } = await useUiContent();

const form = reactive({
  name: '',
  email: '',
  message: '',
  website: ''
});

const formStartedAt = ref(Date.now());

watch(
  loggedIn,
  (isLoggedIn) => {
    if (isLoggedIn && user.value) {
      form.name = form.name || user.value.name || '';
      form.email = form.email || user.value.email || '';
    }
  },
  { immediate: true }
);

const loading = ref(false);
const status = ref<'idle' | 'success' | 'error'>('idle');
const errorMessage = ref('');

async function handleSubmit() {
  loading.value = true;
  status.value = 'idle';
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        message: form.message,
        website: form.website,
        submittedAt: formStartedAt.value
      }
    });
    status.value = 'success';
    form.message = '';
    form.website = '';
    formStartedAt.value = Date.now();
  } catch (err: unknown) {
    status.value = 'error';
    errorMessage.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'Something went wrong. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section id="contact" class="grid gap-10 lg:grid-cols-2 lg:gap-16">
    <div class="space-y-4">
      <UBadge color="neutral" variant="soft" class="tracking-wider text-xs">
        <span><span class="text-success-400/60">~/</span>contact</span>
      </UBadge>
      <h2>
        {{ props.headline }}
      </h2>
      <p class="text-muted">
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
          class="flex h-full flex-col items-start justify-center gap-3"
        >
          <UCard variant="subtle" class="w-full space-y-3">
            <UIcon name="i-lucide-circle-check" class="size-8 text-primary" />
            <div class="space-y-1">
              <p class="text-lg font-semibold">
                {{ ui?.contact.successTitle ?? 'Message sent!' }}
              </p>
              <p class="text-muted">
                {{
                  ui?.contact.successDescription ??
                  "Thanks for reaching out — I'll get back to you soon."
                }}
              </p>
            </div>
          </UCard>
        </div>

        <AuthWall
          v-else-if="!loggedIn"
          :title="ui?.contact.authTitle ?? 'Sign in to send a message'"
          :description="ui?.contact.authDescription ?? ''"
        />

        <form v-else class="space-y-5" @submit.prevent="handleSubmit">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="ui?.contact.form.nameLabel ?? 'Name'">
              <UInput
                v-model="form.name"
                :placeholder="ui?.contact.form.namePlaceholder ?? 'Your name'"
                size="lg"
                required
                :disabled="loading"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="ui?.contact.form.emailLabel ?? 'Email'">
              <UInput
                v-model="form.email"
                type="email"
                :placeholder="
                  ui?.contact.form.emailPlaceholder ?? 'you@example.com'
                "
                size="lg"
                required
                :disabled="loading"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField :label="ui?.contact.form.messageLabel ?? 'Message'">
            <UTextarea
              v-model="form.message"
              :placeholder="
                ui?.contact.form.messagePlaceholder ?? 'What\'s on your mind?'
              "
              :rows="5"
              size="lg"
              required
              :disabled="loading"
              class="w-full"
            />
          </UFormField>

          <div class="sr-only" aria-hidden="true">
            <UFormField :label="ui?.contact.form.honeypotLabel ?? 'Company'">
              <UInput v-model="form.website" autocomplete="off" tabindex="-1" />
            </UFormField>
          </div>

          <div class="flex flex-col gap-3">
            <UButton
              type="submit"
              :label="ui?.contact.form.submit ?? 'Send message'"
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
              :title="ui?.contact.errorTitle ?? 'Failed to send'"
              :description="errorMessage"
            />
          </div>
        </form>
      </Transition>
    </div>
  </section>
</template>
