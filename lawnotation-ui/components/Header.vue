<template>
  <div class="bg-neutral-100 px-2 py-4 flex justify-between">
    <div class="w-40">
      <NuxtLink to="/"><img src="/lawnotation-logo.svg" /></NuxtLink>
    </div>
    <div v-if="user" class="space-x-4">
      <template v-if="role == 'editor'">
        <NuxtLink to="/projects">Projects</NuxtLink>
        <NuxtLink to="/labelset">Labelsets</NuxtLink>
        <span class="text-gray-400 select-none">|</span>
      </template>
      <NuxtLink to="/tasks">Assigned Tasks</NuxtLink>
    </div>
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
<script setup lang="ts">
import { useUserApi, User } from "../data/user";
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const userApi = useUserApi();

const role = ref<string>();

onMounted(async () => {
  if (user.value) {
    role.value = ((await userApi.findByEmail(user.value?.email, "role")) as User).role;
  } else {
    watch(user, async () => {
      if (user.value) {
        role.value = ((await userApi.findByEmail(
          user.value?.email,
          "role"
        )) as User).role;
      }
    });
  }
});
</script>
