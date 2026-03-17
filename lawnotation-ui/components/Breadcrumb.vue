<template>
  <div>
    <PBreadcrumb :model="breadcrumbItems">
      <template #item="{ item, props }">
        <NuxtLink
          v-if="item.url"
          v-slot="{ href, navigate }"
          :to="item.url"
          custom
        >
          <a :href="href" v-bind="props.action" @click="navigate">
            {{ item.label }}
          </a>
        </NuxtLink>
        <span v-else>{{ item.label }}</span>
      </template>
    </PBreadcrumb>
  </div>
</template>

<script setup lang="ts">
import PBreadcrumb from "primevue/breadcrumb";
import { computed } from "vue";

export type Crumb = {
  name: string;
  link: string;
};

const props = withDefaults(
  defineProps<{
    crumbs: Crumb[];
  }>(),
  {
    crumbs: () => [],
  },
);

const breadcrumbItems = computed(() =>
  props.crumbs.map((crumb) => ({
    label: crumb.name,
    url: crumb.link,
  })),
);
</script>
