<script setup lang="ts">
import { useAuth } from "@/composables/auth";
const auth = useAuth();
</script>

<template>
  <div class="bg-neutral-100 px-2 py-4 flex justify-between">
    <div class="w-64">
      <NuxtLink to="/"><img src="/lawnotation-logo.svg" /></NuxtLink>
    </div>
    <div class="auth">
      <template v-if="auth.session.value?.user">
        <span v-if="auth.session.value?.user"
          >Hello {{ auth.session.value?.user.email?.split("@")[0] }}</span
        >
        |
        <button @click="auth.signOut">Sign Out</button>
      </template>
      <template v-else>
        <NuxtLink to="/auth/login">Sign In</NuxtLink>
      </template>
    </div>
  </div>
</template>
