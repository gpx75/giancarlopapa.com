<script setup lang="ts">
definePageMeta({ layout: 'admin' });
useSeoMeta({ title: 'Admin — Contacts', robots: 'noindex, nofollow' });
</script>

<template>
  <UDashboardPanel id="admin-contacts">
    <template #header>
      <UDashboardNavbar title="Contacts" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UColorModeButton />
          <UTooltip text="Go to site">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-external-link"
              square
              to="/"
            />
          </UTooltip>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4">
        <UAlert
          icon="i-lucide-info"
          color="primary"
          variant="soft"
          title="Coming soon"
          description="Contact form submissions will appear here once wired up."
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
