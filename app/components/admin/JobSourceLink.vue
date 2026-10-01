<script setup lang="ts">
// Link to the original job posting, shown underneath a job description.
const props = defineProps<{ url: string | null | undefined }>();

const toast = useToast();

const display = computed(() => {
  if (!props.url) return '';
  try {
    const u = new URL(props.url);
    return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '');
  } catch {
    return props.url;
  }
});

async function copy() {
  if (!props.url) return;
  try {
    await navigator.clipboard.writeText(props.url);
    toast.add({ title: 'Job link copied', color: 'success', icon: 'i-lucide-check' });
  } catch {
    toast.add({ title: 'Could not copy the link', color: 'error', icon: 'i-lucide-triangle-alert' });
  }
}
</script>

<template>
  <div
    v-if="url"
    class="flex items-center gap-1.5 min-w-0 pt-2 mt-2 border-t border-default text-xs text-muted"
  >
    <UIcon name="i-lucide-link" class="size-3.5 shrink-0" />
    <span class="shrink-0">Job posting:</span>
    <ULink
      :to="url"
      target="_blank"
      rel="noopener"
      external
      :title="url"
      class="truncate text-default underline underline-offset-2 hover:text-primary"
    >
      {{ display }}
    </ULink>
    <UButton
      icon="i-lucide-copy"
      size="xs"
      variant="ghost"
      color="neutral"
      aria-label="Copy job posting link"
      class="shrink-0"
      @click="copy"
    />
  </div>
</template>
