<template>
    <a :href="url"
        class="flex items-center justify-center max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition ease-in-out duration-300 md:min-h-[250px] md:min-w-[300px]">
        <div class="text-center">
            <h5 class="mb-6 text-2xl font-bold tracking-tight">{{ title }}</h5>
            <i style="font-size: 3rem" :class="icon"></i>
            <div v-if="description?.length" class="text-xs mt-4">{{ description }}</div>
        </div>
    </a>
</template>
<script setup lang="ts">
const props = defineProps<{
    title: string;
    url: string;
    icon: string;
    description?: string;
}>();

</script>