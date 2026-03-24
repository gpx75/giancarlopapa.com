<script setup lang="ts">
interface Props {
  title?: string;
  description?: string;
}

const { data: ui } = await useUiContent();

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined
});

const resolvedTitle = computed(() => props.title ?? ui.value?.auth.signInTitle ?? 'Sign in to continue');
const resolvedDescription = computed(() => props.description ?? ui.value?.auth.signInDescription ?? '');

const { login } = useAuth();
</script>

<template>
  <UCard variant="subtle" class="space-y-6">
    <div class="space-y-1">
      <p class="text-lg font-semibold">
        {{ resolvedTitle }}
      </p>
      <p class="text-sm text-muted">
        {{ resolvedDescription }}
      </p>
    </div>
    <div class="flex flex-col gap-3">
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
  </UCard>
</template>
