<template>
  <div class="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
    <p class="text-center text-lg text-slate-700">Redirecting to sign-in…</p>
  </div>
</template>
<script setup lang="ts">
// Invitation emails link here as /auth/accept-invite#<email>. Signing in with
// that address (Keycloak sends the code) links the account to the invitation.
onMounted(() => {
  const email = decodeURIComponent(useRoute().hash.replace(/^#/, ""));
  if (useAuthUser().value) return navigateTo("/");
  signIn("/", email || undefined);
});

definePageMeta({ layout: "blank" });
</script>
