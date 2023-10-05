<template>
  <div class="container mx-auto">
    <HelloWorld msg="qui giancarlopapa.com" />
  </div>
</template>

<script>
import HelloWorld from "./components/HelloWorld.vue";
// import '../assets/tailwind.css';
import "@/assets/tailwind.css";

export default {
  name: "App",
  components: {
    HelloWorld,
  },
};
</script>
<style></style>
