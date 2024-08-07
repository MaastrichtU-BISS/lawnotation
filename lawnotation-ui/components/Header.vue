<template>
  <!-- <div class="flex items-center justify-between px-4 py-4 bg-neutral-100"> -->
  <div class="">
    <Menubar class="p-3 justify-between" :pt="{ end: { class: '' } }" :model="[
      {
        label: 'Projects',
        icon: 'pi pi-list',
        route: '/projects',
        dataTest: 'projects-link'
      },
      {
        label: 'Labelsets',
        icon: 'pi pi-tags',
        route: '/labelset',
        dataTest: 'labelset-link'
      },
      {
        label: 'Assigned Tasks',
        icon: 'pi pi-pencil',
        route: '/tasks',
        dataTest: 'assigned-tasks-menu-item'
      },
      {
        is_separator: true
      },
      {
        label: 'Published Tasks',
        icon: 'pi pi-search',
        route: '/published',
        dataTest: 'published-link'
      },
      {
        label: 'Archives',
        icon: 'pi pi-book',
        route: '/archives',
        dataTest: 'archives-menu-item'
      }
    ]">
      <template #start>
        <div class="flex flex-row">
          <div class="w-40">
            <NuxtLink to="/"><img src="/lawnotation-logo.svg" /></NuxtLink>
          </div>
          <div class="ml-4">
            <Button text type="button" icon="pi pi-link" @click="(e) => linksMenu?.toggle(e)" aria-haspopup="true"
              aria-controls="overlay_menu" />
            <Menu ref="linksMenu" id="overlay_menu" :model="[
              {
                label: 'External',
                items: [
                  {
                    label: 'Homepage',
                    url: 'https://www.lawnotation.org',
                    target: '_blank'
                  },
                  {
                    label: 'Documentation',
                    url: 'https://docs.lawnotation.org',
                    target: '_blank'
                  },
                  {
                    label: 'GitHub',
                    url: 'https://www.github.com/MaastrichtU-BISS/lawnotation',
                    target: '_blank'
                  },
                ],
              },
              {
                label: 'Legal',
                items: [
                  {
                    label: 'Terms of Service',
                    url: '/terms-of-service',
                    target: '_blank'
                  },
                  {
                    label: 'Privacy Policy',
                    url: '/privacy-policy',
                    target: '_blank'
                  },
                ]
              }
            ]" :popup="true" />
          </div>
        </div>
      </template>
      <template #item="{ item, props, hasSubmenu }">
        <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
          <a :data-test="item.dataTest" :class="{ active: routeIsActive(item.route) }" v-ripple :href="href"
            v-bind="props.action" @click="navigate">
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
            <Button text plain :label="user.email?.split('@')[0]" type="button" icon="pi pi-user"
              @click="(e) => userMenu?.toggle(e)" aria-haspopup="true" aria-controls="overlay_menu" />
            <TieredMenu ref="userMenu" id="overlay_menu" :model="[
              {
                label: 'Dashboard',
                icon: 'pi pi-chart-pie',
                url: '/dashboard'
              },
              {
                label: guidanceLabel,
                icon: 'pi pi-info-circle',
                command: toggleGuidance
              },
              {
                label: 'Sign out',
                icon: 'pi pi-sign-out',
                command: signOut,
              }
            ]" :popup="true" />
          </div>
        </div>
      </template>
    </Menubar>
  </div>
</template>
<script setup lang="ts">
import type Menu from 'primevue/menu';
import type TieredMenu from 'primevue/tieredmenu';

const supabase = useSupabaseClient()
const user = useSupabaseUser();

const supa = useSupabaseClient();

const { $trpc } = useNuxtApp();

const route = useRoute();

const linksMenu = ref<Menu>();
const userMenu = ref<TieredMenu>();

const guidanceIsVisible = computed(() => {
  return user.value?.user_metadata?.guidanceStatus != false;
});

const guidanceLabel = computed(() => { return guidanceIsVisible.value ? 'Hide Tips' : 'Show Tips' });

const routeIsActive = computed(() => (match: string) => {
  return route.path.startsWith(match);
});

const signOut = async () => {
  await supabase.auth.signOut()
  navigateTo('/auth/login');
}

const toggleGuidance = async () => {
  await $trpc.user.setGuidance.mutate(!guidanceIsVisible.value);
  supa.auth.refreshSession();
}
</script>

<style lang="scss">
// source: https://stackoverflow.com/a/1014958/17864167
div:has(> a.active) {
  // @apply bg-surface-200;
  color: rgb(var(--primary-500));
  background-color: rgb(var(--primary-200) / 0.2);

  &:hover {
    background-color: rgb(var(--primary-200) / 0.15);
  }
}
</style>
