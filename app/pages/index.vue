<script setup lang="ts">
const { profile } = useProfileData();
</script>

<template>
  <div class="flex items-center">
    <UContainer class="w-full py-16">
      <CvHero :hero="profile.hero" :stats="profile.stats" />
    </UContainer>
  </div>

</template>
