<template>
    <NuxtLink ref="url" :to="url" :event="disabled ? '' : 'click'"
        :class="disabled ? 'pointer-events-none text-gray-400' : 'shadow hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition ease-in-out duration-300'"
        class="flex items-center justify-center max-w-sm p-6 rounded-lg md:min-h-[250px] md:min-w-[300px] border border-gray-200 bg-white">
        <div class="text-center">
            <h5 class="mb-6 text-2xl text-inherit font-bold tracking-tight">{{ title }}</h5>
            <i style="font-size: 3rem" :class="icon"></i>
            <div v-if="description?.length" class="text-xs mt-4">{{ description }}</div>
        </div>
    </NuxtLink>
</template>
<script setup lang="ts">
const props = defineProps<{
    title: string;
    url: string;
    icon: string;
    description?: string;
    disabled?: boolean;
}>();
</script>