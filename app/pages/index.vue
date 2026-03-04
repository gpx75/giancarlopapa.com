<script setup lang="ts">
const { profile } = useProfileData()
</script>

<template>
  <UContainer class="py-16">
    <CvHero v-if="profile" :hero="profile.hero" :stats="profile.stats" />
  </UContainer>
</template>
