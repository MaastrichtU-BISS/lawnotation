<template>
  <!-- <div class="bg-neutral-100 px-4 py-4 flex justify-between items-center"> -->
  <div class="bg-neutral-50 border-b border-neutral-200 px-4 py-4 flex justify-between items-center">
    <div class="w-40">
      <NuxtLink to="/"><img src="/lawnotation-logo.svg" /></NuxtLink>
    </div>
    <div v-if="user" class="space-x-4">
      <template v-if="role == 'editor'">
        <NuxtLink to="/projects" class="header-link" :class="{'active': routeIsActive('/projects')}">Projects</NuxtLink>
        <span class="text-gray-400 select-none">|</span>
        <NuxtLink to="/labelset" class="header-link" :class="{'active': routeIsActive('/labelset')}">Labelsets</NuxtLink>
        <span class="text-gray-400 select-none">|</span>
      </template>
      <NuxtLink to="/publications" class="header-link" :class="{'active': routeIsActive('/publications')}">Publications</NuxtLink>
      <span class="text-gray-400 select-none">|</span>
      <NuxtLink to="/tasks" class="header-link" :class="{'active': routeIsActive('/tasks')}">Assigned Tasks</NuxtLink>
    </div>
    <div class="auth">
      <template v-if="user">
        <span class="text-slate-800" v-if="user?.email">{{ user.email?.split("@")[0] }}</span>
        <span class="text-gray-400 select-none mx-3">|</span>
        <button class="header-link" @click="signOut()">Sign Out</button>
      </template>
      <template v-else>
        <NuxtLink class="header-link" to="/auth/login" :class="{'active': routeIsActive('/auth/login')}">Sign In</NuxtLink>
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser();

const { $trpc } = useNuxtApp();

const route = useRoute();
const role = ref<string>((await $trpc.user.findByEmail.query(user.value!.email!)).role);

const routeIsActive = computed(() => {
  return (match: string) => {
    return route.path.startsWith(match);
  }
})

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