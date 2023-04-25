<script setup lang="ts">
const supabase = useSupabaseClient();
const user = useSupabaseUser();
</script>

<template>
  <div class="bg-neutral-100 px-2 py-4 flex justify-between">
    <div class="w-40">
      <NuxtLink to="/"><img src="/lawnotation-logo.svg" /></NuxtLink>
    </div>
    <template v-if="user">
      <div>
        <NuxtLink to="/projects">Projects</NuxtLink>
      </div>
      <div>
        <NuxtLink to="/labelset">Labelsets</NuxtLink>
      </div>
      <div>
        <!-- <NuxtLink to="/assignments">Assignments</NuxtLink> -->
      </div>
    </template>
    <div class="auth">
      <template v-if="user">
        <span v-if="user?.email">Hello {{ user.email?.split("@")[0] }}</span>
        |
        <button @click="supabase.auth.signOut">Sign Out</button>
      </template>
      <template v-else>
        <NuxtLink to="/auth/login">Sign In</NuxtLink>
      </template>
    </div>
  </div>
</template>
