<template>
  <div>
    <div>Landing page</div>
  </div>
</template>
<script setup lang="ts">
const user = useSupabaseUser();
const config = useRuntimeConfig();

onMounted(() => {
  console.log(config.public.baseURL);
});
// definePageMeta({
//   middleware: ["auth"],
// });
</script>
