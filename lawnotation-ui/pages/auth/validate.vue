<template>
  <div class="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
    <p class="text-center text-lg text-slate-700">Redirecting…</p>
  </div>
</template>
<script setup lang="ts">
// Old magic links pointed here. Sign-in now completes at /api/auth/callback.
definePageMeta({
  layout: "blank",
  middleware: () => navigateTo(useAuthUser().value ? "/" : "/auth/login"),
});
</script>
