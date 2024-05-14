<template>
    <a :href="url"
        class="flex items-center justify-center max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-50 text-gray-500 hover:text-gray-600 transition ease-in-out duration-300 md:min-h-[250px] md:min-w-[300px]">
        <div class="text-center">
            <h5 class="mb-6 text-2xl font-bold tracking-tight">{{ title }}</h5>
            <svg class="inline-block w-16 h-16" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="svgD" />
            </svg>
        </div>
    </a>
</template>
<script setup lang="ts">
const props = defineProps<{
    title: string;
    url: string;
    svgD: string;
}>();

</script>