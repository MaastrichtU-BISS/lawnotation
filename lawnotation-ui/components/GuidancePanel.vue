<template>
    <Fieldset class="max-w-md mx-auto mb-4 text-sm" :pt="{
        legend: {
            class: ['p-3']
        },
        content: {
            class: ['p-3 pt-0']
        }
    }">
        <template #legend class="p-3">
            <div class="flex items-center gap-2 px-2">
                <i class="pi pi-info-circle text-yellow-300 animate-bounce" />
                <span class="font-bold">{{ title }}</span>
            </div>
        </template>
        <p class="m-0">
            {{ text }}
        </p>
    </Fieldset>
</template>
<script setup lang="ts">
const props = defineProps<{
    title: string;
    text: string;
}>();
</script>