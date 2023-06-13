<template>
  <nav class="flex m-4" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1">
      <li class="inline-flex items-center" v-for="(crumb, i) of props.crumbs" :key="crumb.link">
        <svg v-if="i > 0" aria-hidden="true" class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>

        <NuxtLink v-if="i < props.crumbs.length-1" :to="crumb.link" class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white">
          {{ crumb.name }}
        </NuxtLink>
        <span v-else class="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
          {{ crumb.name }}
        </span>
      </li>
      <li v-if="false">
        <div class="flex items-center">
          <svg aria-hidden="true" class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
          <a href="#" class="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2 dark:text-gray-400 dark:hover:text-white">Projects</a>
        </div>
      </li>
      <li v-if="false">
        <div class="flex items-center">
          <svg aria-hidden="true" class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
          <span class="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">Flowbite</span>
        </div>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">

const props = defineProps<{
  crumbs: {
    icon?: string,
    name: string,
    link: string
  }[]
}>();
</script>