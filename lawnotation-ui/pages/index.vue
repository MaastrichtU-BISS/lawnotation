<template>
  <div>
    
  </div>
</template>
<script setup lang="ts">
const user = useSupabaseUser();
const role = ref<string>();

const { $trpc } = useNuxtApp();

definePageMeta({
  middleware: ['auth']
})
</script>

