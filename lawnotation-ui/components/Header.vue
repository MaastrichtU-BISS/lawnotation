<template>
  <!-- <div class="flex items-center justify-between px-4 py-4 bg-neutral-100"> -->
  <div
    class="flex items-center justify-between px-4 py-4 border-b bg-neutral-50 border-neutral-200"
  >
    <div class="w-40">
      <NuxtLink to="/"><img src="/lawnotation-logo.svg" /></NuxtLink>
    </div>
    <div v-if="user" class="space-x-4">
      <NuxtLink
        to="/projects"
        class="header-link"
        :class="{ active: routeIsActive('/projects') }"
        data-test="projects-link"
        >Projects</NuxtLink
      >
      <span class="text-gray-400 select-none">|</span>
      <NuxtLink
        to="/labelset"
        class="header-link"
        :class="{ active: routeIsActive('/labelset') }"
        data-test="labelsets-link"
        >Labelsets</NuxtLink
      >
      <span class="text-gray-400 select-none">|</span>
      <NuxtLink to="/published" class="header-link" :class="{'active': routeIsActive('/published')}">Published Data</NuxtLink>
      <span class="text-gray-400 select-none">|</span>
      <NuxtLink
        to="/tasks"
        class="header-link"
        :class="{ active: routeIsActive('/tasks') }"
        data-test="assigned-tasks-menu-item"
        >Assigned Tasks</NuxtLink
      >
    </div>
    <div class="auth">
      <template v-if="user">
        <span class="text-slate-800" v-if="user?.email">{{
          user.email?.split("@")[0]
        }}</span>
        <span class="mx-3 text-gray-400 select-none">|</span>
        <button class="header-link" @click="signOut()">Sign Out</button>
      </template>
      <template v-else>
        <NuxtLink
          class="header-link"
          to="/auth/login"
          :class="{ active: routeIsActive('/auth/login') }"
          >Sign In</NuxtLink
        >
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser();

const { $trpc } = useNuxtApp();

const route = useRoute();

const routeIsActive = computed(() => {
  return (match: string) => {
    return route.path.startsWith(match);
  };
});

const signOut = async () => {
  await supabase.auth.signOut()
  navigateTo('/auth/login');
}
</script>

<style lang="scss">
.header-link {
  @apply text-gray-600;
  transition: color 0.2s;

  &:hover {
    @apply text-gray-900;
  }

  &.active {
    @apply text-gray-900 border-b-2 border-slate-500;
  }
}
</style>
