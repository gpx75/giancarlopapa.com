<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

defineProps<{
  collapsed?: boolean
}>();

const { user, logout } = useAuth();
const colorMode = useColorMode();

const items = computed<DropdownMenuItem[][]>(() => [[{
  type: 'label',
  label: user.value?.name ?? 'Admin',
  avatar: { src: user.value?.avatar, alt: user.value?.name }
}], [{
  label: 'Appearance',
  icon: 'i-lucide-sun-moon',
  children: [{
    label: 'Light',
    icon: 'i-lucide-sun',
    type: 'checkbox',
    checked: colorMode.value === 'light',
    onSelect(e: Event) {
      e.preventDefault();
      colorMode.preference = 'light';
    }
  }, {
    label: 'Dark',
    icon: 'i-lucide-moon',
    type: 'checkbox',
    checked: colorMode.value === 'dark',
    onSelect(e: Event) {
      e.preventDefault();
      colorMode.preference = 'dark';
    }
  }]
}], [{
  label: 'Back to site',
  icon: 'i-lucide-arrow-left',
  to: '/'
}, {
  label: 'Log out',
  icon: 'i-lucide-log-out',
  onSelect: () => logout()
}]]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        label: collapsed ? undefined : (user?.name ?? 'Admin'),
        avatar: { src: user?.avatar, alt: user?.name },
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{ trailingIcon: 'text-dimmed' }"
    />
  </UDropdownMenu>
</template>
