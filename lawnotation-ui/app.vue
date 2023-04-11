<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
<script setup lang="ts">
import { useAuth } from "@/composables/auth";
const auth = useAuth();
</script>
