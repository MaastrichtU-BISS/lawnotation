<template>
  <!-- <div class="flex items-center justify-between px-4 py-4 bg-neutral-100"> -->
  <div class="">
    <Menubar class="p-3 justify-between" :pt="{end: {class: ''}}" :model="[
      {
        label: 'Projects',
        icon: 'pi pi-list',
        route: '/projects'
      },
      {
        label: 'Published Tasks',
        icon: 'pi pi-search',
        route: '/published'
      },
      {
          is_separator: true
      },
      {
        label: 'Assigned Tasks',
        icon: 'pi pi-list',
        route: '/tasks'
      }
    ]">
      <template #start>
        <div class="flex flex-row">
          <div class="w-40">
            <NuxtLink to="/"><img src="/lawnotation-logo.svg" /></NuxtLink>
          </div>
          <div class="ml-4">
            <Button text type="button" icon="pi pi-link" @click="(e) => linksMenu?.toggle(e)" aria-haspopup="true" aria-controls="overlay_menu" />
            <Menu ref="linksMenu" id="overlay_menu" :model="[
              {
                label: 'External',
                items: [
                  {
                    label: 'Homepage',
                    url: 'https://www.lawnotation.org'
                  },
                  {
                    label: 'GitHub',
                    url: 'https://www.github.com/MaastrichtU-BISS/lawnotation'
                  },
                ],
              },
              {
                label: 'Legal',
                items: [
                  {
                    label: 'Terms of Service',
                    url: '/terms-of-service'
                  },
                  {
                    label: 'Privacy Policy',
                    url: '/privacy-policy'
                  },
                ]
              }
            ]" :popup="true" />
          </div>
        </div>
      </template>
      <template #item="{ item, props, hasSubmenu }">
        <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
            <a v-ripple :href="href" v-bind="props.action" @click="navigate">
                <span :class="item.icon" />
                <span class="ml-2">{{ item.label }}</span>
            </a>
        </router-link>
        <span v-else-if="item.is_separator" class="border-gray-400 border-r mx-2"></span>
        <a v-else v-ripple :href="item.url" :target="item.target" v-bind="props.action">
            <span :class="item.icon" />
            <span class="ml-2">{{ item.label }}</span>
            <span v-if="hasSubmenu" class="pi pi-fw pi-angle-down ml-2" />
        </a>
      </template>
      <template #end>
        <div class="flex align-items-center gap-2">
          <div v-if="user">
            <Button
              text plain
              :label="user.email?.split('@')[0]"
              type="button"
              icon="pi pi-user"
              @click="(e) => userMenu?.toggle(e)"
              aria-haspopup="true"
              aria-controls="overlay_menu"
            />
            <TieredMenu ref="userMenu" id="overlay_menu" :model="[
              {
                label: 'Settings',
                icon: 'pi pi-cog',
                url: '/settings'
              },
              {
                label: 'Sign out',
                icon: 'pi pi-sign-out',
                command: signOut,
              },
              {
                label: 'External links',
                icon: 'pi pi-link',
                items: [
                  {
                    label: 'Homepage',
                    url: 'https://www.lawnotation.org'
                  },
                  {
                    label: 'GitHub',
                    url: 'https://www.github.com/MaastrichtU-BISS/lawnotation'
                  },
                  {
                    separator: true
                  },
                  {
                    label: 'Terms of Service',
                    url: '/terms-of-service'
                  },
                  {
                    label: 'Privacy Policy',
                    url: '/privacy-policy'
                  },
                ],
              },
            ]" :popup="true" />
          </div>
        </div>
      </template>
    </Menubar>
  </div>


  <div
    v-if="false"
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
        data-test="labelset-link"
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
import type Menu from 'primevue/menu';

const supabase = useSupabaseClient()
const user = useSupabaseUser();

const { $trpc } = useNuxtApp();

const route = useRoute();

const linksMenu = ref<Menu>();
const userMenu = ref<TieredMenu>();

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
