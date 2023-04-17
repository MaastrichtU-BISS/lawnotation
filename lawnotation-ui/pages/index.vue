<template>
  <div>
    <div v-if="user">
      <span>Go to: </span><NuxtLink to="/projects">Projects</NuxtLink>
    </div>
  </div>
</template>
<script setup lang="ts">
const user = useSupabaseUser();
// definePageMeta({
//   middleware: ["auth"],
// });
</script>
