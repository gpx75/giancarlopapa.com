<template>
  <div class="text-center">
    <h1
      class="text-4xl sm:text-6xl lg:text-7xl leading-none font-extrabold tracking-tight text-gray-900 mt-10 mb-8 sm:mt-14 sm:mb-10"
    >
      {{ msg }}
    </h1>
  </div></template
>

<script>
export default {
  name: "HelloWorld",
  props: {
    msg: String,
  },
};
</script>
